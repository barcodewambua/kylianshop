// ============================================================
//  KylianShop — Express REST API Server
//  Run: node server.js (or npm run dev with nodemon)
// ============================================================
require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const pool     = require('./db');

const app  = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'kylianshop_secret';

// ─── Middleware ─────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'null', '*'],
  credentials: true,
}));
app.use(express.json());

// ─── Helper: Auth middleware ────────────────────────────────
function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ============================================================
//  PRODUCTS
// ============================================================

// GET /api/products  — optional ?category=men|women|accessories&sort=price_asc|price_desc|newest
app.get('/api/products', async (req, res) => {
  try {
    const { category, sort } = req.query;

    let query  = 'SELECT * FROM products WHERE is_active = TRUE';
    const vals = [];

    if (category && category !== 'all') {
      vals.push(category);
      query += ` AND category = $${vals.length}`;
    }

    const orderMap = {
      price_asc:  'price ASC',
      price_desc: 'price DESC',
      newest:     'created_at DESC',
    };
    query += ` ORDER BY ${orderMap[sort] || 'created_at DESC'}`;

    const { rows } = await pool.query(query, vals);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id
app.get('/api/products/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM products WHERE id = $1 AND is_active = TRUE',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// ============================================================
//  USERS — Register & Login
// ============================================================

// POST /api/users/register
app.post('/api/users/register', async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Check for existing account
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1,$2,$3,$4) RETURNING id, email, first_name, last_name',
      [email, hash, firstName || '', lastName || '']
    );

    const token = jwt.sign({ id: rows[0].id, email: rows[0].email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ success: true, token, user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/users/login
app.post('/api/users/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/users/me  (protected — verify token)
app.get('/api/users/me', authRequired, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, first_name, last_name, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch user' });
  }
});

// ============================================================
//  ORDERS
// ============================================================

// POST /api/orders — create order from checkout
/*
  Expected body:
  {
    email, firstName, lastName, address, city, zip,
    items: [{ productId, productName, size, quantity, price }]
  }
*/
app.post('/api/orders', async (req, res) => {
  const { email, firstName, lastName, address, city, zip, items } = req.body;

  if (!email || !items || items.length === 0) {
    return res.status(400).json({ error: 'Email and at least one item are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Calculate totals
    const subtotal = items.reduce((sum, i) => sum + (parseFloat(i.price) * i.quantity), 0);
    const shipping = 10.00;
    const total    = subtotal + shipping;

    // Create order header
    const orderRes = await client.query(
      `INSERT INTO orders (email, first_name, last_name, address, city, zip_code, subtotal, shipping, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [email, firstName, lastName, address, city, zip, subtotal.toFixed(2), shipping, total.toFixed(2)]
    );
    const orderId = orderRes.rows[0].id;

    // Insert line items
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, size, quantity, unit_price)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [orderId, item.productId || null, item.productName || item.name, item.size || 'M', item.quantity, parseFloat(item.price)]
      );

      // Decrease stock (if product exists in DB)
      if (item.productId) {
        await client.query(
          'UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id = $2',
          [item.quantity, item.productId]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, orderId, total: total.toFixed(2) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Order creation failed' });
  } finally {
    client.release();
  }
});

// GET /api/orders  (protected — list orders for logged-in user)
app.get('/api/orders', authRequired, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.*, json_agg(oi.*) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.email = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.user.email]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ============================================================
//  CONTACT
// ============================================================

// POST /api/contact
app.post('/api/contact', async (req, res) => {
  const { firstName, lastName, email, subject, message } = req.body;

  if (!email || !message) {
    return res.status(400).json({ error: 'Email and message are required' });
  }

  try {
    await pool.query(
      'INSERT INTO contact_messages (first_name, last_name, email, subject, message) VALUES ($1,$2,$3,$4,$5)',
      [firstName || '', lastName || '', email, subject || '', message]
    );
    res.json({ success: true, message: 'Your message has been received. We\'ll be in touch soon!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// ─── Health check ────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

// ─── 404 fallback ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Start server ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 KylianShop API running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
});
