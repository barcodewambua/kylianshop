-- ============================================================
--  KylianShop — Database Schema
--  Run: psql -U postgres -d kylianshop -f backend/schema.sql
-- ============================================================

-- Drop tables in dependency order (safe re-run)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS contact_messages CASCADE;
DROP TABLE IF EXISTS user_messages CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ─── USERS ──────────────────────────────────────────────────
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name    VARCHAR(100),
  last_name     VARCHAR(100),
  role          VARCHAR(20) DEFAULT 'customer',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PRODUCTS ───────────────────────────────────────────────
CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  price       NUMERIC(10, 2) NOT NULL,
  category    VARCHAR(100),          -- 'men', 'women', 'accessories'
  image_url   TEXT,
  stock       INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ORDERS ─────────────────────────────────────────────────
CREATE TABLE orders (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  email         VARCHAR(255) NOT NULL,   -- for guest checkouts
  first_name    VARCHAR(100),
  last_name     VARCHAR(100),
  address       TEXT,
  city          VARCHAR(100),
  zip_code      VARCHAR(20),
  subtotal      NUMERIC(10, 2),
  shipping      NUMERIC(10, 2) DEFAULT 10.00,
  total         NUMERIC(10, 2),
  status        VARCHAR(50) DEFAULT 'pending',  -- pending, paid, shipped, delivered
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ORDER ITEMS ────────────────────────────────────────────
CREATE TABLE order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255),    -- snapshot at time of order
  size        VARCHAR(10),
  quantity    INTEGER NOT NULL,
  unit_price  NUMERIC(10, 2) NOT NULL
);

-- ─── CONTACT MESSAGES ───────────────────────────────────────
CREATE TABLE contact_messages (
  id          SERIAL PRIMARY KEY,
  first_name  VARCHAR(100),
  last_name   VARCHAR(100),
  email       VARCHAR(255),
  subject     VARCHAR(255),
  message     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── USER MESSAGES (ADMIN TO CUSTOMER) ──────────────────────
CREATE TABLE user_messages (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  subject     VARCHAR(255) NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_products_category  ON products(category);
CREATE INDEX idx_orders_email       ON orders(email);
CREATE INDEX idx_order_items_order  ON order_items(order_id);
CREATE INDEX idx_user_messages_user ON user_messages(user_id);
