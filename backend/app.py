import os
from functools import wraps
from dotenv import load_dotenv
from flask import Flask, request, jsonify, g, send_from_directory
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import jwt
import bcrypt

load_dotenv()

# serve static files from workspace root (parent of backend)
app = Flask(__name__, static_folder=os.path.abspath(os.path.join(os.path.dirname(__file__), '../')),
            static_url_path='')
CORS(app, origins=["http://localhost:5500", "http://127.0.0.1:5500", "null", "*"])

JWT_SECRET = os.getenv("JWT_SECRET", "kylianshop_secret")

# create a simple connection pool that will be shared across requests
_db_pool = psycopg2.pool.SimpleConnectionPool(
    1,
    10,
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", 5432)),
    user=os.getenv("DB_USER", "postgres"),
    password=os.getenv("DB_PASSWORD", ""),
    database=os.getenv("DB_NAME", "kylianshop"),
)


def get_db():
    if not hasattr(g, "_db_conn") or g._db_conn.closed:
        g._db_conn = _db_pool.getconn()
    return g._db_conn


@app.teardown_appcontext
def release_db(exc=None):
    conn = getattr(g, "_db_conn", None)
    if conn is not None:
        _db_pool.putconn(conn)


# --- authentication helpers ------------------------------------------------
def _decode_token(auth_header):
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except Exception:
        return None


def auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        payload = _decode_token(request.headers.get("Authorization"))
        if not payload:
            return jsonify({"error": "Unauthorized"}), 401
        g.user = payload
        return f(*args, **kwargs)

    return decorated


def admin_required(f):
    @wraps(f)
    @auth_required
    def decorated(*args, **kwargs):
        # look up role in database (don't trust token alone)
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT role FROM users WHERE id = %s", (g.user.get("id"),))
        row = cur.fetchone()
        if not row or row.get("role") != "admin":
            return jsonify({"error": "Forbidden"}), 403
        return f(*args, **kwargs)

    return decorated


# --- utilities -------------------------------------------------------------
def query(sql, params=None, fetchone=False, commit=False):
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(sql, params or [])
    if commit:
        conn.commit()
    if fetchone:
        return cur.fetchone()
    return cur.fetchall()


def execute(sql, params=None):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(sql, params or [])
    conn.commit()


# ----------------------------------------------------------------------------
# public product endpoints
# ----------------------------------------------------------------------------

@app.route("/api/products", methods=["GET"])
def list_products():
    category = request.args.get("category")
    sort = request.args.get("sort")
    sql = "SELECT * FROM products WHERE is_active = TRUE"
    params = []
    if category and category != "all":
        sql += " AND category = %s"
        params.append(category)
    order_map = {
        "price_asc": "price ASC",
        "price_desc": "price DESC",
        "newest": "created_at DESC",
    }
    sql += " ORDER BY " + order_map.get(sort, "created_at DESC")

    rows = query(sql, params)
    return jsonify(rows)


@app.route("/api/products/<int:prod_id>", methods=["GET"])
def get_product(prod_id):
    row = query(
        "SELECT * FROM products WHERE id = %s AND is_active = TRUE", (prod_id,), fetchone=True
    )
    if not row:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(row)


# ----------------------------------------------------------------------------
# user authentication & information
# ----------------------------------------------------------------------------

@app.route("/api/users/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    first_name = data.get("firstName")
    last_name = data.get("lastName")

    if not email or not password or len(password) < 6:
        return jsonify({"error": "Email and password (min 6 chars) required"}), 400

    existing = query("SELECT id FROM users WHERE email = %s", (email,))
    if existing:
        return jsonify({"error": "Account already exists"}), 409

    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    row = query(
        "INSERT INTO users (email, password_hash, first_name, last_name) VALUES (%s,%s,%s,%s) RETURNING id,email,first_name,last_name,role",
        (email, pw_hash, first_name or "", last_name or ""),
        fetchone=True,
        commit=True,
    )

    token = jwt.encode({"id": row["id"], "email": row["email"]}, JWT_SECRET, algorithm="HS256")
    return jsonify({"success": True, "token": token, "user": row})


@app.route("/api/users/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    row = query("SELECT * FROM users WHERE email = %s", (email,), fetchone=True)
    if not row:
        return jsonify({"error": "Invalid credentials"}), 401

    if not bcrypt.checkpw(password.encode(), row["password_hash"].encode()):
        return jsonify({"error": "Invalid credentials"}), 401

    token = jwt.encode({"id": row["id"], "email": row["email"]}, JWT_SECRET, algorithm="HS256")
    # hide password_hash
    user = {k: v for k, v in row.items() if k != "password_hash"}
    return jsonify({"success": True, "token": token, "user": user})


@app.route("/api/users/me", methods=["GET"])
@auth_required
def me():
    row = query(
        "SELECT id,email,first_name,last_name,role,created_at FROM users WHERE id = %s",
        (g.user.get("id"),),
        fetchone=True,
    )
    if not row:
        return jsonify({"error": "User not found"}), 404
    return jsonify(row)


# ----------------------------------------------------------------------------
# orders
# ----------------------------------------------------------------------------

@app.route("/api/orders", methods=["POST"])
def create_order():
    data = request.get_json() or {}
    email = data.get("email")
    items = data.get("items") or []
    if not email or not items:
        return jsonify({"error": "Email and at least one item required"}), 400

    first_name = data.get("firstName")
    last_name = data.get("lastName")
    address = data.get("address")
    city = data.get("city")
    zip_code = data.get("zip")

    conn = get_db()
    cur = conn.cursor()
    try:
        conn.autocommit = False
        subtotal = sum(float(i.get("price", 0)) * i.get("quantity", 0) for i in items)
        shipping = 10.0
        total = subtotal + shipping

        cur.execute(
            "INSERT INTO orders (email, first_name, last_name, address, city, zip_code, subtotal, shipping, total)"
            " VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
            (email, first_name, last_name, address, city, zip_code, subtotal, shipping, total),
        )
        order_id = cur.fetchone()[0]

        for it in items:
            cur.execute(
                "INSERT INTO order_items (order_id, product_id, product_name, size, quantity, unit_price)"
                " VALUES (%s,%s,%s,%s,%s,%s)",
                (
                    order_id,
                    it.get("productId"),
                    it.get("productName") or it.get("name"),
                    it.get("size") or "M",
                    it.get("quantity"),
                    float(it.get("price", 0)),
                ),
            )
            if it.get("productId"):
                cur.execute(
                    "UPDATE products SET stock = GREATEST(stock - %s,0) WHERE id = %s",
                    (it.get("quantity"), it.get("productId")),
                )

        conn.commit()
        return jsonify({"success": True, "orderId": order_id, "total": total})
    except Exception as err:
        conn.rollback()
        return jsonify({"error": "Order creation failed"}), 500
    finally:
        conn.autocommit = True


@app.route("/api/orders", methods=["GET"])
@auth_required
def list_orders():
    rows = query(
        """
        SELECT o.*, json_agg(oi.*) AS items
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.email = %s
        GROUP BY o.id
        ORDER BY o.created_at DESC
        """,
        (g.user.get("email"),),
    )
    return jsonify(rows)


# ----------------------------------------------------------------------------
# contact messaging
# ----------------------------------------------------------------------------

@app.route("/api/contact", methods=["POST"])
def contact():
    data = request.get_json() or {}
    email = data.get("email")
    message = data.get("message")
    if not email or not message:
        return jsonify({"error": "Email and message required"}), 400

    execute(
        "INSERT INTO contact_messages (first_name,last_name,email,subject,message)"
        " VALUES (%s,%s,%s,%s,%s)",
        (data.get("firstName"), data.get("lastName"), email, data.get("subject"), message),
    )
    return jsonify({"success": True, "message": "Your message has been received."})


# ----------------------------------------------------------------------------
# customer-specific endpoints
# ----------------------------------------------------------------------------

@app.route("/api/user/messages", methods=["GET"])
@auth_required
def user_messages():
    msgs = query(
        "SELECT id, subject, message, is_read, created_at FROM user_messages WHERE user_id = %s ORDER BY created_at DESC",
        (g.user.get("id"),),
    )
    return jsonify(msgs)


# ----------------------------------------------------------------------------
# admin routes
# ----------------------------------------------------------------------------

@app.route("/api/admin/products", methods=["GET"])
@admin_required
def admin_list_products():
    rows = query("SELECT * FROM products ORDER BY created_at DESC")
    return jsonify(rows)


@app.route("/api/admin/products", methods=["POST"])
@admin_required
def admin_create_product():
    data = request.get_json() or {}
    required = ["name", "price"]
    if not all(k in data for k in required):
        return jsonify({"error": "name and price required"}), 400
    execute(
        "INSERT INTO products (name, description, price, category, image_url, stock, is_active)"
        " VALUES (%s,%s,%s,%s,%s,%s,%s)",
        (
            data.get("name"),
            data.get("description"),
            data.get("price"),
            data.get("category"),
            data.get("image_url"),
            data.get("stock", 0),
            True,
        ),
    )
    return jsonify({"success": True})


@app.route("/api/admin/products/<int:prod_id>", methods=["DELETE"])
@admin_required
def admin_delete_product(prod_id):
    execute("UPDATE products SET is_active = FALSE WHERE id = %s", (prod_id,))
    return jsonify({"success": True})


@app.route("/api/admin/orders", methods=["GET"])
@admin_required
def admin_list_orders():
    rows = query(
        """
        SELECT o.*, json_agg(oi.*) AS items
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        GROUP BY o.id
        ORDER BY o.created_at DESC
        """
    )
    return jsonify(rows)


@app.route("/api/admin/orders/<int:order_id>", methods=["PUT"])
@admin_required
def admin_approve_order(order_id):
    # flip status to 'shipped' for example
    execute("UPDATE orders SET status = %s WHERE id = %s", ("shipped", order_id))
    return jsonify({"success": True})


@app.route("/api/admin/messages", methods=["POST"])
@admin_required
def admin_send_message():
    data = request.get_json() or {}
    user_id = data.get("user_id") or data.get("userId")
    subject = data.get("subject")
    message = data.get("message")
    if not user_id or not subject or not message:
        return jsonify({"error": "user_id, subject and message required"}), 400
    execute(
        "INSERT INTO user_messages (user_id, subject, message) VALUES (%s,%s,%s)",
        (user_id, subject, message),
    )
    return jsonify({"success": True})


# root placeholder (helps when browser hits /)
@app.route("/", methods=["GET"])
def root():
    # serve index.html from static root
    return send_from_directory(app.static_folder, 'index.html')

# catch-all for static files (css/js/html)
@app.route('/<path:path>')
def serve_file(path):
    # if file exists under static_folder, return it
    target = os.path.join(app.static_folder, path)
    if os.path.isfile(target):
        return send_from_directory(app.static_folder, path)
    # otherwise fallback to index (SPA style)
    return send_from_directory(app.static_folder, 'index.html')

# health check
@app.route("/api/health", methods=["GET"])
def health():
    try:
        _ = query("SELECT 1")
        return jsonify({"status": "ok", "db": "connected"})
    except Exception:
        return jsonify({"status": "error", "db": "disconnected"}), 500


# fallback 404
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": f"Route {request.method} {request.path} not found"}), 404


if __name__ == "__main__":
    port = int(os.getenv("PORT", 3001))
    print(f"🚀 KylianShop API (Python) running on http://localhost:{port}")
    app.run(port=port)
