import express from 'express';
import cors from 'cors';
import { db, getNextOrderNo } from './db.js';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// // --- TEMPORARY MIGRATION: REMOVE AFTER ONE RUN ---
// Run this by itself to ensure the table exists
// Ensure this is a clean, single string
const createAddonCatsSQL = `
  CREATE TABLE IF NOT EXISTS addon_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    selection_type TEXT DEFAULT 'single',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`;

// CHANGE THIS LINE:
try {
  db.prepare(createAddonCatsSQL).run();
  console.log("✅ Tables system initialized.");
} catch (err) {
  console.error("❌ Database initialization failed:", err.message);
}

// createTablesSQL = `
//   CREATE TABLE IF NOT EXISTS addon_items (
//     id TEXT PRIMARY KEY,
//     category_id TEXT NOT NULL,
//     name TEXT NOT NULL,
//     price_cents INTEGER DEFAULT 0,
//     is_active INTEGER DEFAULT 1,
//     FOREIGN KEY (category_id) REFERENCES addon_categories(id),
//     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
//   );
// `;

// db.prepare(createTablesSQL).run();
// console.log(createTablesSQL);
// // ------------------------------------------------

/**
 * Helper to calculate totals using Cents (Integers)
 * Prevents floating point math issues.
 */
function calcTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.unit_price_cents), 0);
  // VAT calculation: (Price * Qty) * (VAT / 100)
  const vatTotal = items.reduce((sum, item) => {
    return sum + Math.round((item.qty * item.unit_price) * (item.vat_percent / 100))
  },0);
  
  return {
    subtotal_cents: subtotal,
    vat_total_cents: vatTotal,
    grand_total_cents: subtotal + vatTotal
  };
}

app.get('/health', (_req, res) => res.json({ ok: true }));

// --- Auth ---
app.post('/auth/login', (req, res) => {
  const { pin } = req.body;
  const user = db.prepare('SELECT id, username, first_name, last_name, role, status FROM users WHERE pin = ? AND status = ?').get(pin, 'active');
  if (!user) return res.status(401).json({ message: 'Invalid PIN' });
  res.json(user);
});

app.get('/users', (_req, res) => {
  const rows = db.prepare('SELECT id, username, first_name, last_name, role, status, created_at FROM users ORDER BY created_at DESC').all();
  res.json(rows);
});

app.post('/users', (req, res) => {
  const { username, first_name, last_name, pin, role = 'staff', status = 'active' } = req.body;
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO users (id, username, first_name, last_name, pin, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, username, first_name, last_name, pin, role, status);
  res.status(201).json({ id });
});

app.put('/users/:id', (req, res) => {
  const { username, first_name, last_name, pin, role, status } = req.body;
  db.prepare('UPDATE users SET username=?, first_name=?, last_name=?, pin=?, role=?, status=? WHERE id=?')
    .run(username, first_name, last_name, pin, role, status, req.params.id);
  res.json({ ok: true });
});

// --- Menus & Categories ---
app.get('/menus', (_req, res) => {
  const rows = db.prepare('SELECT * FROM menus WHERE is_active = 1 ORDER BY created_at DESC').all();
  res.json(rows);
});

app.post('/menus', (req, res) => {
  const { name, is_discountable } = req.body;
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO menus (id, name, is_discountable) VALUES (?, ?, ?)').run(id, name, is_discountable);
  res.status(201).json({ id });
});

app.put ('/menus/:id', (req, res) =>{
  const{name, is_active, is_discountable} = req.body;

  db.prepare(`
    UPDATE menus 
    SET name=?, is_active=?, is_discountable=?
    WHERE id=?
  `).run(name, is_active ? 1 : 0, is_discountable??1, req.params.id);

  res.json({ ok: true});
});

app.get('/categories', (_req, res) => {
  const { menu_id } = _req.query;
  let rows;
  if (menu_id) {
    rows = db.prepare('SELECT * FROM categories WHERE is_active = 1 AND menu_id = ? ORDER BY sort_order, name').all(menu_id);
  } else {
    rows = db.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order, name').all();
  }
  res.json(rows);
});

app.post('/categories', (req, res) => {
  const { menu_id, name, color = '#d1fae5', sort_order = 0, is_discountable, available_from, available_to, category_type = 0} = req.body;
  const id = crypto.randomUUID();
  try {
    db.prepare('INSERT INTO categories (id, menu_id, name, color, sort_order, is_discountable, available_from, available_to, category_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, menu_id, name, color, sort_order, is_discountable, available_from, available_to, category_type);
    res.status(201).json({ id });
  } catch (err) {
    console.error("Database Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put('/categories/:id', (req, res) => {
  const { menu_id, name, color, sort_order, is_active , is_discountable, available_from, available_to, category_type} = req.body;
  try {
    db.prepare('UPDATE categories SET menu_id = ?, name=?, color=?, sort_order=?, is_active=?, is_discountable=?, available_from=?, available_to=?, category_type=? WHERE id=?')
      .run(menu_id, name, color, sort_order, is_active ? 1 : 0, is_discountable?? 1, available_from || '00:00', available_to || '23:59', category_type || 0, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("Database Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/products-with-flags', (req, res) => {
  const { category_id } = req.query;
  let rows;
  if (category_id) {
     rows = db.prepare(`
      SELECT 
        p.*, 
        c.menu_id,
        -- Product is only discountable if BOTH the menu AND category allow it
        (m.is_discountable AND c.is_discountable) AS is_discountable,
        c.category_type
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN menus m ON c.menu_id = m.id
      WHERE p.is_active = 1
      AND category_id = ? 
      ORDER BY name
    `).all(category_id);
  } else {
    rows = db.prepare(`
      SELECT 
        p.*, 
        c.menu_id,
        -- Product is only discountable if BOTH the menu AND category allow it
        (m.is_discountable AND c.is_discountable) AS is_discountable,
        c.category_type
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN menus m ON c.menu_id = m.id
      WHERE p.is_active = 1
      ORDER BY name
    `).all();
  }
  
  res.json(rows);
});

app.get('/products', (req, res) => {
  const { category_id } = req.query;
  let rows;
  if (category_id) {
    rows = db.prepare('SELECT * FROM products WHERE is_active = 1 AND category_id = ? ORDER BY name').all(category_id);
  } else {
    rows = db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY name').all();
  }
  res.json(rows);
});

app.post('/products', (req, res) => {
  const { category_id, name, price_cents, vat_percent = 0, barcode = '', color = '#ffffff' } = req.body;
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO products (id, category_id, name, price_cents, vat_percent, barcode, color) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, category_id, name, price_cents, vat_percent, barcode, color);
  res.status(201).json({ id });
});

app.put('/products/:id', (req, res) => {
  const { category_id, name, price_cents, vat_percent, barcode, color, is_active } = req.body;
  db.prepare('UPDATE products SET category_id=?, name=?, price_cents=?, vat_percent=?, barcode=?, color=?, is_active=? WHERE id=?')
    .run(category_id, name, Number(price_cents), Number(vat_percent), barcode, color, is_active ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

app.get('/orders', (req, res) => {
  const status = req.query.status;
  const rows = status
    ? db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC').all(status)
    : db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  res.json(rows);
});

app.get('/orders/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
  res.json({ ...order, items });
});

app.post('/orders/hold', (req, res) => {
  const { user_id, order_type = 'walk_in', items = [] } = req.body;
  const id = crypto.randomUUID();
  const orderNo = getNextOrderNo();
  const mappedItems = items.map(item => ({
    ...item,
    unit_price: Number(item.unit_price),
    vat_percent: Number(item.vat_percent),
    qty: Number(item.qty)
  }));
  const totals = calcTotals(mappedItems);

  const insertOrder = db.prepare(`INSERT INTO orders
    (id, order_no, user_id, status, order_type, subtotal, vat_total, grand_total)
    VALUES (?, ?, ?, 'held', ?, ?, ?, ?)`);
  insertOrder.run(id, orderNo, user_id, order_type, totals.subtotal, totals.vatTotal, totals.grandTotal);

  const insertItem = db.prepare(`INSERT INTO order_items
    (id, order_id, product_id, product_name, qty, unit_price, vat_percent, line_total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const tx = db.transaction(() => {
    for (const item of mappedItems) {
      insertItem.run(crypto.randomUUID(), id, item.product_id, item.product_name, item.qty, item.unit_price, item.vat_percent, item.qty * item.unit_price);
    }
  });
  tx();
  res.status(201).json({ id, order_no: orderNo, status: 'held', ...totals });
});

// app.post('/orders/pay', (req, res) => {
//   const { user_id, order_type = 'walk_in', items = [], amount_paid } = req.body;
//   const id = crypto.randomUUID();
//   const orderNo = getNextOrderNo();

//   const mappedItems = items.map(item => ({
//     product_id: item.product_id,
//     product_name: item.product_name,
//     qty: parseInt(item.qty),
//     unit_price_cents: parseInt(item.unit_price_cents),
//     vat_percent: parseFloat(item.vat_percent)
//   }));

//   const totals = calcTotals(mappedItems);
//   const changeDue = amount_paid_cents - totals.grand_total_cents;

//   if (changeDue < 0) {
//     return res.status(400).json({ message: 'Insufficient payment' });
//   }

//   // 2. Transactional Save
//   const tx = db.transaction(() => {
//     // Insert Main Order
//     db.prepare(`
//       INSERT INTO orders (id, order_no, user_id, status, order_type, subtotal_cents, vat_total_cents, grand_total_cents, amount_paid_cents, change_due_cents)
//       VALUES (?, ?, ?, 'paid', ?, ?, ?, ?, ?, ?)
//     `).run(orderId, orderNo, user_id, order_type, totals.subtotal_cents, totals.vat_total_cents, totals.grand_total_cents, amount_paid_cents, changeDue);

//     // Insert Order Items
//     const itemStmt = db.prepare(`
//       INSERT INTO order_items (id, order_id, product_id, product_name, qty, unit_price_cents, vat_percent, line_total_cents)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//     `);

//     for (const item of mappedItems) {
//       const lineTotal = item.qty * item.unit_price_cents;
//       itemStmt.run(crypto.randomUUID(), orderId, item.product_id, item.product_name, item.qty, item.unit_price_cents, item.vat_percent, lineTotal);
//     }
//   });

//   tx();
  
//   res.status(201).json({ 
//     id: orderId, 
//     order_no: orderNo, 
//     change_due_cents: changeDue,
//     ...totals 
//   });
// });

app.post('/pay-order', (req, res) => {
  const { 
    user_id, items, discount_percent, discount_total_cents, 
    deposit_amount_cents, subtotal_cents, vat_total_cents, 
    grand_total_cents, amount_paid_cents, payment_method 
  } = req.body;

  const orderId = crypto.randomUUID();
  // Calculate change: (Amount Handled) - (What they actually owed)
  const payable = grand_total_cents - deposit_amount_cents;
  const change_due_cents = payment_method === 'cash' ? Math.max(0, amount_paid_cents - payable) : 0;

  // We wrap this in a transaction for safety
  const executeOrder = db.transaction(() => {
    // 1. Create the Parent Order
    const orderStmt = db.prepare(`
      INSERT INTO orders (
        id, order_no, user_id, status, discount_percent, 
        discount_total_cents, deposit_amount_cents, subtotal_cents, 
        vat_total_cents, grand_total_cents, amount_paid_cents, 
        change_due_cents, payment_method
      ) VALUES (?, (SELECT IFNULL(MAX(order_no), 0) + 1 FROM orders), ?, 'paid', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    orderStmt.run(
      orderId, user_id, discount_percent, discount_total_cents, 
      deposit_amount_cents, subtotal_cents, vat_total_cents, 
      grand_total_cents, amount_paid_cents, change_due_cents, payment_method
    );

    // 2. Create the Child Items
    const itemStmt = db.prepare(`
      INSERT INTO order_items (
        id, order_id, product_id, product_name, qty, 
        unit_price_cents, vat_percent, discount_amount_cents, 
        note, line_total_cents
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      const line_discount = item.is_discountable !== 0 
        ? Math.round((item.qty * item.unit_price_cents) * (discount_percent / 100)) 
        : 0;
      
      const line_total = (item.qty * item.unit_price_cents) - line_discount;

      itemStmt.run(
        crypto.randomUUID(),
        orderId,
        item.product_id,
        item.product_name,
        item.qty,
        item.unit_price_cents,
        item.vat_percent,
        line_discount,
        item.note || null,
        line_total
      );
    }

    return orderId;
  });

  try {
    executeOrder();
    // Get the order number we just generated to show the user
    const finalOrder = db.prepare("SELECT order_no, change_due_cents FROM orders WHERE id = ?").get(orderId);
    res.json(finalOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save order" });
  }
});

app.put('/orders/:id/cancel', (req, res) => {
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('cancelled', req.params.id);
  res.json({ ok: true });
});

// --- Reports ---
app.get('/reports/daily-sales', (_req, res) => {
  const summary = db.prepare(`
    SELECT COUNT(*) AS orders_count,
           COALESCE(SUM(grand_total_cents), 0) AS total_sales_cents,
           COALESCE(SUM(vat_total_cents), 0) AS total_vat_cents
    FROM orders
    WHERE status = 'paid' AND DATE(created_at) = DATE('now')
  `).get();

  const recentOrders = db.prepare(`
    SELECT id, order_no, grand_total_cents, created_at 
    FROM orders 
    WHERE status = 'paid' 
    ORDER BY created_at DESC LIMIT 20
  `).all();

  res.json({ summary, recentOrders });
});

app.listen(port, () => {
  console.log(`POS backend running on http://localhost:${port}`);
});

app.get('/reports/sales', (req, res) => {
  const { start, end } = req.query; // Format: 'YYYY-MM-DD'
  
  try {
    // 1. Summary Report: Grouped by Payment Method & Status
    const summary = db.prepare(`
      SELECT 
        payment_method,
        b.order_count,
        SUM(subtotal_cents) as total_subtotal,
        SUM(vat_total_cents) as total_vat,
        SUM(discount_total_cents) as total_discounts,
        SUM(deposit_amount_cents) as total_deposits,
        SUM(grand_total_cents) as total_order_value,
        SUM(amount_paid_cents) as total_collected
      FROM orders a 
	  inner join (select order_id, count(*) order_count from order_items group by order_id) b  on a.id = b.order_id 
      WHERE date(created_at) BETWEEN ? AND ?
      AND status = 'paid'
      GROUP BY payment_method
    `).all(start, end);

    // 2. Detailed Items Report: Which products are selling?
    const detailed = db.prepare(`
      SELECT 
        product_name,
        SUM(qty) as total_qty,
        unit_price_cents,
        SUM(discount_amount_cents) as total_discount_given,
        SUM(line_total_cents) as total_revenue
      FROM order_items
      WHERE order_id IN (
        SELECT id FROM orders 
        WHERE date(created_at) BETWEEN ? AND ? 
        AND status = 'paid'
      )
      GROUP BY product_id, unit_price_cents
      ORDER BY total_qty DESC
    `).all(start, end);

    res.json({ summary, detailed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/tables', (req, res) => {
  const rows = db.prepare('SELECT * FROM tables WHERE is_active = 1 ORDER BY name').all();
  res.json(rows);
});

app.post('/tables', (req, res) => {
  const { name, capacity, is_active } = req.body;
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO tables (id, name, capacity,is_active) VALUES (?, ?, ?,?)')
    .run(id, name, capacity || 2, is_active);
  res.status(201).json({ id });
});

app.put('/tables/:id', (req, res) => {
  const { name, capacity, is_active } = req.body;
  db.prepare('UPDATE tables SET name = ?, capacity = ?, is_active = ? WHERE id = ?')
    .run(name, capacity, is_active, req.params.id);
  res.json({ ok: true });
});

// Addon Categories
app.get('/addon_categories', (req, res) => res.json(db.prepare('SELECT * FROM addon_categories WHERE is_active = 1 ORDER BY name').all()));
app.post('/addon_categories', (req, res) => {
  const { name, selection_type, is_active } = req.body;
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO addon_categories (id, name, selection_type,is_active) VALUES (?, ?, ?,?)').run(id, name, selection_type,is_active);
  
  res.status(201).json({ id });
});

app.put('/addon_categories/:id', (req, res) => {
  const { name, selection_type, is_active } = req.body;
  try {
    db.prepare(`
      UPDATE addon_categories 
      SET name = ?, selection_type = ?, is_active = ? 
      WHERE id = ?
    `).run(name, selection_type, is_active ?? 1, req.params.id);
    
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Addon Items
app.get('/addon_items', (req, res) => res.json(db.prepare('SELECT * FROM addon_items WHERE is_active = 1 ORDER BY name').all()));
app.post('/addon_items', (req, res) => {
  const { category_id, name, price_cents, is_active } = req.body;
  const id = crypto.randomUUID();
  try {
    db.prepare('INSERT INTO addon_items (id, category_id, name, price_cents, is_active) VALUES (?, ?, ?, ?,?)').run(id, category_id, name, price_cents,is_active);
    
    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/addon_items/:id', (req, res) => {
  const { category_id, name, price_cents, is_active } = req.body;
  try {
    db.prepare('UPDATE addon_items SET category_id=?, name=?, price_cents=?, is_active = ? WHERE id = ?')
      .run(category_id, name, price_cents, is_active, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get all mappings for a specific product
app.get('/product-addons/:productId', (req, res) => {
  const rows = db.prepare(`
    SELECT ac.* FROM addon_categories ac
    JOIN product_addon_map pam ON ac.id = pam.addon_category_id
    WHERE pam.product_id = ?
    ORDER BY pam.sort_order
  `).all(req.params.productId);
  res.json(rows);
});

// Update mappings for a product
app.post('/product-addons/:productId', (req, res) => {
  const { categoryIds } = req.body; // Array of IDs: ['cat1', 'cat2']
  const productId = req.params.productId;

  const transaction = db.transaction(() => {
    // 1. Clear existing mappings for this product
    db.prepare('DELETE FROM product_addon_map WHERE product_id = ?').run(productId);

    // 2. Insert new mappings
    const insert = db.prepare('INSERT INTO product_addon_map (product_id, addon_category_id, sort_order) VALUES (?, ?, ?)');
    categoryIds.forEach((catId, index) => {
      insert.run(productId, catId, index);
    });
  });

  transaction();
  res.json({ ok: true });
});