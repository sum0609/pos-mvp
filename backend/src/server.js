import express from 'express';
import cors from 'cors';
import { db, getNextOrderNo } from './db.js';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

function calcTotals(items, discountPercent = 0) {
  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.unit_price_cents), 0);
  
  const vatTotal = items.reduce((sum, item) => {
    const lineTotal = item.qty * item.unit_price_cents;
    let priceAfterDiscount = lineTotal;

    // Apply discount if item is discountable
    if (item.is_discountable !== 0) {
      priceAfterDiscount = lineTotal * (1 - (discountPercent / 100));
    }

    return sum + Math.round(priceAfterDiscount * (item.vat_percent / 100));
  }, 0);

  const discountTotal = items.reduce((sum, item) => {
    if (item.is_discountable === 0) return sum;
    return sum + Math.round((item.qty * item.unit_price_cents) * (discountPercent / 100));
  }, 0);

  return {
    subtotal_cents: subtotal,
    vat_total_cents: vatTotal,
    discount_total_cents: discountTotal,
    grand_total_cents: (subtotal - discountTotal) + vatTotal
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
  const { status } = req.query;

  try {
    // If the frontend explicitly requests held orders, run our rich joined table query!
    if (status === 'held') {
      const heldOrders = db.prepare(`
        SELECT 
          o.*,
          ts.table_id,
          t.name AS table_name
        FROM orders o
        LEFT JOIN table_sessions ts ON o.id = ts.order_id
        LEFT JOIN tables t ON ts.table_id = t.id
        WHERE o.status = 'held'
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `).all();

      const formattedOrders = heldOrders.map(order => ({
        ...order,
        grand_total: (order.grand_total_cents || 0) / 100,
        items: []
      }));

      return res.json(formattedOrders);
    }

    // Otherwise, execute your normal generic orders fallback list
    const allOrders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
    res.json(allOrders);

  } catch (err) {
    console.error("Failed to query orders:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/orders/:id', (req, res) => {
  // If this was above /orders/held, req.params.id became "held" 
  // and returned the empty item container you were seeing!
  const { id } = req.params;
  
  try {
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    
    const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(id);
    res.json({ ...order, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/orders/held', (req, res) => {
  try {
    const heldOrders = db.prepare(`
      SELECT 
        o.*,
        ts.table_id,
        t.name AS table_name
      FROM orders o
      LEFT JOIN table_sessions ts ON o.id = ts.order_id
      LEFT JOIN tables t ON ts.table_id = t.id
      WHERE o.status = 'held'
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `).all();

    const formattedOrders = heldOrders.map(order => ({
      ...order,
      grand_total: (order.grand_total_cents || 0) / 100,
      items: []
    }));

    res.json(formattedOrders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/orders/hold', (req, res) => {
  // 1. Extract the new fields from the body
  const { 
    user_id, items, order_type, order_id, 
    discount_percent, deposit_amount_cents 
  } = req.body; 

  if (!user_id || !Array.isArray(items)) {
    return res.status(400).json({ error: "Missing user_id or items array" });
  }

  try {
    const tx = db.transaction(() => {
      const targetOrderId = order_id || crypto.randomUUID();
      
      db.prepare(`DELETE FROM order_items WHERE order_id = ?`).run(targetOrderId);

      const existingOrder = db.prepare(`SELECT id FROM orders WHERE id = ?`).get(targetOrderId);

      const discountPct = Number(discount_percent || 0);
      const depositCents = Number(deposit_amount_cents || 0);

      if (!existingOrder) {
        const orderNo = "H" + Math.floor(1000 + Math.random() * 9000);
        // Include discount and deposit columns on initial insert
        db.prepare(`
          INSERT INTO orders (
            id, order_no, user_id, status, order_type, 
            discount_percent, deposit_amount_cents,
            subtotal_cents, vat_total_cents, grand_total_cents
          ) VALUES (?, ?, ?, 'held', ?, ?, ?, 0, 0, 0)
        `).run(targetOrderId, orderNo, user_id, order_type || 'walk_in', discountPct, depositCents);
      } else {
        // Update existing master record status alongside active modifiers
        db.prepare(`
          UPDATE orders SET 
            status = 'held', 
            discount_percent = ?, 
            deposit_amount_cents = ? 
          WHERE id = ?
        `).run(discountPct, depositCents, targetOrderId);
      }

      const insertItem = db.prepare(`
        INSERT INTO order_items (
          id, order_id, product_id, product_name, qty, 
          unit_price_cents, vat_percent, line_total_cents, note, addons
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let totalSubtotal = 0;
      let totalVat = 0;

      for (const item of items) {
        const qty = Number(item.qty || 1);
        const unitPrice = Number(item.unit_price_cents || item.base_price_cents || 0);
        const lineTotal = qty * unitPrice;
        
        totalSubtotal += lineTotal;
        
        // Account for line-item item discounts if it applies
        let priceAfterDiscount = lineTotal;
        if (item.is_discountable !== 0) {
          priceAfterDiscount = lineTotal * (1 - (discountPct / 100));
        }
        totalVat += Math.round(priceAfterDiscount * ((Number(item.vat_percent || 0)) / 100));

        let addonsJsonString = "[]";
        if (item.addons) {
          addonsJsonString = typeof item.addons === 'string' ? item.addons : JSON.stringify(item.addons);
        }

        insertItem.run(
          crypto.randomUUID(), 
          targetOrderId,
          item.product_id,
          item.product_name,
          qty,
          unitPrice,
          Number(item.vat_percent || 0),
          lineTotal,
          item.note || "",
          addonsJsonString
        );
      }

      // Calculate final grand total based on your application math logic
      const discountTotalCents = items.reduce((sum, item) => {
        if (item.is_discountable === 0) return sum;
        const lineTotal = item.qty * (item.unit_price_cents || item.base_price_cents || 0);
        return sum + Math.round(lineTotal * (discountPct / 100));
      }, 0);

      const grandTotal = totalSubtotal + totalVat - discountTotalCents;

      db.prepare(`
        UPDATE orders SET 
          subtotal_cents = ?, 
          vat_total_cents = ?, 
          grand_total_cents = ? 
        WHERE id = ?
      `).run(totalSubtotal, totalVat, grandTotal, targetOrderId);
    });

    tx();
    res.json({ success: true, message: "Order saved successfully." });

  } catch (err) {
    console.error("CRITICAL ERROR inside /orders/hold:", err);
    res.status(500).json({ error: "Failed to hold order: " + err.message });
  }
});

app.post('/pay-order', (req, res) => {
  console.log("PAYMENT DATA RECEIVED:", req.body);
  const { 
    order_id, user_id, items, discount_percent, discount_total_cents, 
    deposit_amount_cents, subtotal_cents, vat_total_cents, 
    grand_total_cents, amount_paid_cents, payment_method 
  } = req.body;

  // const finalOrderId = order_id || crypto.randomUUID();
  // Calculate change: (Amount Handled) - (What they actually owed)
  const payable = grand_total_cents - deposit_amount_cents;
  const change_due_cents = payment_method === 'cash' ? Math.max(0, amount_paid_cents - payable) : 0;

  // We wrap this in a transaction for safety
  const executeOrder = db.transaction(() => {
    let targetOrderId;
    if (order_id) {
      targetOrderId = order_id;
      // 1. UPDATE existing order instead of Inserting
      const info = db.prepare(`
        UPDATE orders SET 
          status = 'paid',
          discount_percent = ?, 
          discount_total_cents = ?, 
          deposit_amount_cents = ?, 
          subtotal_cents = ?, 
          vat_total_cents = ?, 
          grand_total_cents = ?, 
          amount_paid_cents = ?, 
          change_due_cents = ?, 
          payment_method = ?
        WHERE id = ?
      `).run(
        discount_percent, discount_total_cents, deposit_amount_cents, 
        subtotal_cents, vat_total_cents, grand_total_cents, 
        amount_paid_cents, change_due_cents, payment_method, targetOrderId
      );

      // If no row was updated, it means the ID was invalid; fallback to insert or throw error
      if (info.changes === 0) {
          throw new Error("Order to update not found");
      }

      // Clear existing items so we can re-insert the finalized list
      db.prepare("DELETE FROM order_items WHERE order_id = ?").run(targetOrderId);
    } else {
      targetOrderId = crypto.randomUUID();
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
      targetOrderId, user_id, discount_percent, discount_total_cents, 
      deposit_amount_cents, subtotal_cents, vat_total_cents, 
      grand_total_cents, amount_paid_cents, change_due_cents, payment_method
    );

  }

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
        targetOrderId,
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

    return targetOrderId;
    
  });

  try {
    const finalOrderId = executeOrder();
    const result = db.prepare("SELECT order_no, change_due_cents FROM orders WHERE id = ?").get(finalOrderId);
    res.json(result);
  } catch (err) {
    console.error("Payment Transaction Failed:", err);
    res.status(500).json({ error: err.message });
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


  // Ensure this is NOT inside another app.post block
  app.post('/table_sessions', (req, res) => {
    const { table_id, covers, user_id } = req.body;
    const sessionId = crypto.randomUUID();
    const orderId = crypto.randomUUID(); 
    const orderNo = getNextOrderNo();

    try {
      const tx = db.transaction(() => {
        // 1. Create the Order FIRST (Session depends on Order ID)
        // We use a fallback to ensure user_id exists in your 'users' table.
        // If 'system' isn't a user, this will fail. Use a known valid user ID.
        db.prepare(`
          INSERT INTO orders (id, order_no, user_id, status, order_type, table_id)
          VALUES (?, ?, ?, 'held', 'dine_in', ?)
        `).run(orderId, orderNo, user_id, table_id);

        // 2. Create the Session SECOND
        db.prepare("INSERT INTO table_sessions (id, table_id, order_id, covers) VALUES (?, ?, ?, ?)")
          .run(sessionId, table_id, orderId, covers);

        // 3. Update table status
        db.prepare("UPDATE tables SET status = 'occupied' WHERE id = ?")
          .run(table_id);
      });

      tx();
      res.json({ id: sessionId, order_id: orderId, order_no: orderNo });
    } catch (err) {
      console.error("Session Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

app.get('/tables_din_in', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        t.id, 
        t.name, 
        t.capacity, 
        t.status,
        ts.covers,
        o.grand_total_cents as current_total
      FROM tables t
      LEFT JOIN table_sessions ts ON t.id = ts.table_id AND ts.is_active = 1
      LEFT JOIN orders o ON ts.order_id = o.id
      WHERE t.is_active = 1 
      ORDER BY t.name
    `).all();
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/table_sessions/sync', (req, res) => {
  const { sessionId, cart } = req.body;

  if (!sessionId || !Array.isInstance ? !Array.isArray(cart) : !Array.isArray(cart)) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    const tx = db.transaction(() => {
      // 1. Fetch current active session context
      const session = db.prepare("SELECT order_id FROM table_sessions WHERE id = ?").get(sessionId);
      if (!session) throw new Error("Active table session context not found");
      const orderId = session.order_id;

      // 2. Wipe existing temporary order items rows to build a fresh batch
      db.prepare("DELETE FROM order_items WHERE order_id = ?").run(orderId);

      // 3. Prepare an insert targeting explicit note/addons definitions
      const insertItem = db.prepare(`
        INSERT INTO order_items (
          id, order_id, product_id, product_name, qty, 
          unit_price_cents, vat_percent, line_total_cents, note, addons
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of cart) {
        // Safe types conversion to prevent math crashes
        const qty = Number(item.qty || 1);
        const unitPrice = Number(item.unit_price_cents || 0);
        const lineTotal = qty * unitPrice;
        
        // CRITICAL FIX: Ensure the raw array maps cleanly into a string snapshot
        const addonsList = Array.isArray(item.addons) ? item.addons : [];
        const addonsJsonString = JSON.stringify(addonsList);

        insertItem.run(
          item.cart_item_id || crypto.randomUUID(), 
          orderId, 
          item.product_id, 
          item.product_name,
          qty, 
          unitPrice, 
          Number(item.vat_percent || 0), 
          lineTotal,
          item.note || "",
          addonsJsonString // <--- Saves the selections to your column
        );
      }

      // 4. Recalculate global order sums
      const totals = calcTotals(cart, 0); 
      db.prepare(`
        UPDATE orders SET 
          subtotal_cents = ?, 
          vat_total_cents = ?, 
          grand_total_cents = ? 
        WHERE id = ?
      `).run(totals.subtotal_cents, totals.vat_total_cents, totals.grand_total_cents, orderId);
    });

    tx();
    res.json({ ok: true });
  } catch (err) {
    console.error("Critical error inside table sync session controller:", err);
    res.status(500).json({ error: "Sync operation aborted: " + err.message });
  }
});


// server.js

app.get('/table_orders/:tableId', (req, res) => {
  const { tableId } = req.params;

  try {
    // 1. Find the latest open session for this table
    const session = db.prepare(`
      SELECT id, order_id FROM table_sessions 
      WHERE table_id = ? AND is_active = 1
      ORDER BY created_at DESC LIMIT 1
    `).get(tableId);

    if (!session || !session.order_id) {
      return res.status(404).json({ message: "No active session found" });
    }

    // 2. Fetch items. 
    // FIX: We substitute p.is_discountable with a hardcoded fallback '1 AS is_discountable'
    let items = [];
    try {
      items = db.prepare(`
        SELECT 
          oi.id as cart_item_id,
          oi.product_id,
          oi.product_name,
          oi.qty,
          oi.unit_price_cents,
          oi.vat_percent,
          oi.note,
          oi.addons,
          c.category_type,
          1 AS is_discountable
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE oi.order_id = ?
      `).all(session.order_id);
    } catch (sqlErr) {
      console.warn("Main SQL Query failed, trying fallback without note/addons columns:", sqlErr.message);
      
      // Secondary fallback query in case 'note' or 'addons' columns don't exist yet either
      items = db.prepare(`
        SELECT 
          oi.id as cart_item_id,
          oi.product_id,
          oi.product_name,
          oi.qty,
          oi.unit_price_cents,
          oi.vat_percent,
          c.category_type,
          1 AS is_discountable
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE oi.order_id = ?
      `).all(session.order_id);
    }

    // 3. Map items to include default values for frontend calculations
    const formattedItems = items.map(item => {
      let parsedAddons = [];
      try {
        if (item.addons) {
          parsedAddons = typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons;
        }
      } catch (e) {
        console.warn(`Failed to parse addons for item ${item.cart_item_id}:`, e);
      }

      const addonCost = parsedAddons.reduce((sum, a) => sum + (a.price_cents || 0), 0);
      const basePrice = item.unit_price_cents - addonCost;

      return {
        cart_item_id: item.cart_item_id,
        product_id: item.product_id,
        product_name: item.product_name,
        qty: item.qty,
        unit_price_cents: item.unit_price_cents,
        base_price_cents: basePrice, 
        price_cents: basePrice,      
        vat_percent: item.vat_percent || 0,
        note: item.note || "",
        addons: parsedAddons,        
        category_type: item.category_type ?? 1,
        is_discountable: item.is_discountable
      };
    });

    res.json({ 
      session_id: session.id,
      order_id: session.order_id,
      items: formattedItems 
    });
  } catch (err) {
    console.error("CRITICAL CRASH in /table_orders:", err);
    res.status(500).json({ error: "Internal Server Error: " + err.message });
  }
});

app.post('/close_session', (req, res) => {
  const { sessionId } = req.body;
  const session = db.prepare("SELECT table_id FROM table_sessions WHERE id = ?").get(sessionId);
  
  const tx = db.transaction(() => {
    // 1. Deactivate session
    db.prepare("UPDATE table_sessions SET is_active = 0, closed_at = CURRENT_TIMESTAMP WHERE id = ?").run(sessionId);
    // 2. Make table available
    db.prepare("UPDATE tables SET status = 'available' WHERE id = ?").run(session.table_id);
  });
  tx();
  res.json({ ok: true });
});

app.post('/table_sessions/cancel', (req, res) => {
  const { sessionId } = req.body;

  try {
    const session = db.prepare("SELECT table_id, order_id FROM table_sessions WHERE id = ?").get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const tx = db.transaction(() => {
      // 1. Mark the order as cancelled so it doesn't appear in "Held" or "Paid"
      db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(session.order_id);

      // 2. Deactivate the session
      db.prepare(`
        UPDATE table_sessions 
        SET is_active = 0, closed_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(sessionId);

      // 3. Reset the table to available
      db.prepare("UPDATE tables SET status = 'available' WHERE id = ?")
        .run(session.table_id);
    });

    tx();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});