import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'pos.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  pin TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('manager','staff')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. MENUS & CATEGORIES
CREATE TABLE IF NOT EXISTS menus (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_discountable INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  menu_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#d1fae5',
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_discountable INTEGER NOT NULL DEFAULT 1,
  available_from TEXT DEFAULT '00:00',
  available_to TEXT DEFAULT '23:59',
  category_type INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (menu_id) REFERENCES menus(id)
);

-- 3. PRODUCTS (Stored prices as INTEGERS/Cents)
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  vat_percent REAL NOT NULL DEFAULT 0,
  barcode TEXT,
  color TEXT DEFAULT '#ffffff',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 4. ORDERS (Stored totals as INTEGERS/Cents)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_no INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('held','paid','cancelled')),
  
  discount_percent REAL DEFAULT 0,      -- The 5%, 10%, etc. applied
  total_discount_cents INTEGER DEFAULT 0, -- Sum of all line discounts
  deposit_amount_cents INTEGER DEFAULT 0, -- The £ deposit subtracted from payable
  tip_amount_cents INTEGER DEFAULT 0,     -- The tip added during payment
  payment_method TEXT,

  order_type TEXT NOT NULL DEFAULT 'walk_in',
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  vat_total_cents INTEGER NOT NULL DEFAULT 0,
  
  discount_total_cents INTEGER NOT NULL DEFAULT 0,
  grand_total_cents INTEGER NOT NULL DEFAULT 0,
  amount_paid_cents INTEGER NOT NULL DEFAULT 0,
  change_due_cents INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 5. ORDER ITEMS (Snapshotting price/VAT at time of sale)
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  qty INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  vat_percent REAL NOT NULL,
  discount_amount_cents INTEGER DEFAULT 0,
  note TEXT,
  line_total_cents INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 6. SHIFTS
CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  opening_cash_cents INTEGER NOT NULL DEFAULT 0,
  expected_cash_cents INTEGER NOT NULL DEFAULT 0,
  closing_cash_cents INTEGER,
  start_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 7. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. tables
CREATE TABLE IF NOT EXISTS tables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  capacity INTEGER DEFAULT 2,
  status TEXT DEFAULT 'available', -- 'available', 'occupied', 'reserved'
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Add-on Category
CREATE TABLE IF NOT EXISTS addon_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    selection_type TEXT DEFAULT 'single', -- 'single' or 'multiple'
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

-- 10. Add-on List
CREATE TABLE IF NOT EXISTS addon_items (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price_cents INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES addon_categories(id)
  );

  -- 11. product_addon_map
  CREATE TABLE IF NOT EXISTS product_addon_map (
    product_id TEXT NOT NULL,
    addon_category_id TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, addon_category_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (addon_category_id) REFERENCES addon_categories(id) ON DELETE CASCADE
  );

-- PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

`);

/**
 * Robust Order Number Generator
 * Using a transaction ensures that even with rapid requests, 
 * the order number remains sequential and unique.
 */
export function getNextOrderNo() {
  return db.transaction(() => {
    const row = db.prepare('SELECT MAX(order_no) AS lastNo FROM orders').get();
    return (row?.lastNo || 0) + 1;
  })();
  // const row = db.prepare('SELECT COALESCE(MAX(order_no), 0) + 1 AS nextNo FROM orders').get();
  // return row.nextNo;
}

/**
 * Standard Audit Logger
 */
export function logAction({ userId = null, action, entityType, entityId = null, note = '' }) {
  const stmt = db.prepare(`INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, note)
                           VALUES (?, ?, ?, ?, ?, ?)`);
  stmt.run(crypto.randomUUID(), userId, action, entityType, entityId, note);
}

try {
  db.exec("ALTER TABLE menus ADD COLUMN is_discountable INTEGER NOT NULL DEFAULT 1;");
} catch (e) {
  // Column already exists, ignore the error
}
try {
  db.exec("ALTER TABLE categories ADD COLUMN is_discountable INTEGER NOT NULL DEFAULT 1;");
} catch (e) {
  // Column already exists, ignore the error
}