-- ============================================================
--  KylianShop — Seed Data
--  Run: psql -U postgres -d kylianshop -f backend/seed.sql
--  (run schema.sql first)
-- ============================================================

INSERT INTO products (name, description, price, category, image_url, stock) VALUES
(
  'Essential White Tee',
  'A timeless, premium-quality white t-shirt crafted from 100% organic cotton. Relaxed fit with a clean crew neck — the ultimate wardrobe staple.',
  45.00,
  'men',
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1780&auto=format&fit=crop',
  50
),
(
  'Minimalist Black Jacket',
  'Sleek and structured, this minimal black jacket transitions effortlessly from day to night. Premium wool-blend exterior with a clean silhouette.',
  185.00,
  'men',
  'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=1936&auto=format&fit=crop',
  20
),
(
  'Classic Denim Jeans',
  'Straight-cut denim in a classic indigo wash. Made from sustainable denim with the perfect amount of stretch for all-day comfort.',
  120.00,
  'men',
  'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1887&auto=format&fit=crop',
  35
),
(
  'Oversized Beige Knit',
  'Luxuriously soft oversized knit sweater in warm beige. Perfect for layering or wearing alone with minimal accessories.',
  95.00,
  'women',
  'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=1964&auto=format&fit=crop',
  0  -- SOLD OUT
),
(
  'White Cotton Hoodie',
  'Elevated loungewear at its finest. This premium cotton hoodie features a relaxed fit, kangaroo pocket and soft brushed lining.',
  80.00,
  'women',
  'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=1972&auto=format&fit=crop',
  40
),
(
  'Casual Oxford Shirt',
  'A modern take on the classic Oxford shirt. Lightweight, breathable fabric with a tailored fit — perfect for both office and casual settings.',
  65.00,
  'men',
  'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=1888&auto=format&fit=crop',
  30
);
-- Admin user for testing (password = 1212jkl1212)
INSERT INTO users (email, password_hash, first_name, last_name, role)
VALUES ('meliudwambua@gmail.com', '$2b$12$LaublvGkmPMDS.lRWyjQ/eHZjxqv.JpyhYklBZk.d3pAkNgbwvbmS', 'Meliud', 'Wambua', 'admin');