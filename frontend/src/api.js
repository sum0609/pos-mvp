const API = 'http://localhost:4000';

// Helper to convert UI decimal (10.99) to Database integer (1099)
export const toCents = (amount) => Math.round(parseFloat(amount) * 100);

// Helper to convert Database integer (1099) to UI decimal (10.99)
export const fromCents = (cents) => (cents / 100).toFixed(2);

async function request(path, options = {}) {
  const fetchOptions = {
    ...options,
    headers: { 
      'Content-Type': 'application/json',
      ...options.headers 
    },
  };

  const response = await fetch(`${API}${path}`, fetchOptions);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }
  
  return response.json();
}

export const api = {
  // --- Auth & Users ---
  login: (pin) => request('/auth/login', { 
    method: 'POST', body: JSON.stringify({ pin }) 
  }),
  getUsers: () => request('/users'),
  createUser: (payload) => request('/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (id, payload) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  // --- Menus & Categories ---
  getMenus: () => request('/menus'),
  createMenu: (payload) => request('/menus', {method: 'POST', body: JSON.stringify(payload)}),
  updateMenu: (id, payload) => request(`/menus/${id}`, { method: 'PUT', body: JSON.stringify(payload)}),
  getCategories: (menuId) => request(menuId ? `/categories?menu_id=${menuId}` : '/categories'),
  createCategory: (payload) => request('/categories', { method: 'POST', body: JSON.stringify(payload) }),
  updateCategory: (id, payload) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  // --- Products ---
  // Payload should include price_cents
  getProducts: (categoryId) => request(categoryId ? `/products?category_id=${categoryId}` : '/products'),

  getProductsWithFlags: (categoryId) => request(categoryId ? `/products-with-flags?category_id=${categoryId}` : '/products'),
  createProduct: (payload) => request('/products', { method: 'POST', body: JSON.stringify(payload) }),
  updateProduct: (id, payload) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  // --- Orders ---
  getOrders: (status) => request(status ? `/orders?status=${status}` : '/orders'),
  getHeldOrdersWithNames: () => request('/orders/held'),
  getOrder: (id) => request(`/orders/${id}`),

  // Note: Ensure items in payload use 'unit_price_cents'
  holdOrder: (payload) => request('/orders/hold', { method: 'POST', body: JSON.stringify(payload) }),

  // Payload should include 'amount_paid_cents'
  // payOrder: (payload) => request('/orders/pay', { method: 'POST', body: JSON.stringify(payload) }),
  payOrder: (orderData) => request('/pay-order', {
    method: 'POST',
    body: JSON.stringify(orderData)
  }),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: 'PUT' }),

  // --- Reports ---
  dailySales: () => request('/reports/daily-sales'),

  getSalesReport: (start, end) => {
    const s = start || new Date().toISOString().split('T')[0];
    const e = end || s;
    return request(`/reports/sales?start=${s}&end=${e}`);
  },

  // ---tables---
  getTables: () => request('/tables'),
  createTable: (payload) => request('/tables', {method: 'POST', body: JSON.stringify(payload)}),
  updateTable: (id, payload) => request(`/tables/${id}`, { method: 'PUT', body: JSON.stringify(payload)}),


  // ---addon_categories---
  getAddonCategories: () => request('/addon_categories'),
  createAddonCategory: (payload) => request('/addon_categories', {method: 'POST', body: JSON.stringify(payload)}),
  updateAddonCategory: (id, payload) => request(`/addon_categories/${id}`, { method: 'PUT', body: JSON.stringify(payload)}),


  // ---addon_items---
  getAddonItems: () => request('/addon_items'),
  createAddonItem: (payload) => request('/addon_items', {method: 'POST', body: JSON.stringify(payload)}),
  updateAddonItem: (id, payload) => request(`/addon_items/${id}`, { method: 'PUT', body: JSON.stringify(payload)}),


  getTables_din_in: () => request('/tables_din_in'),
  getOrderByTable: (tableId) => request(`/table_orders/${tableId}`),
  createTableSession: (payload) => request('/table_sessions', {method: 'POST', body: JSON.stringify(payload)}),

  syncTableOrder: (sessionId, cart) => request('/table_sessions/sync', {
    method: 'POST',
    body: JSON.stringify({ sessionId, cart })
  }),

  closeTableSession: (sessionId) => request('/close_session', {
      method: 'POST',
      body: JSON.stringify({ sessionId })}),

  cancelTableSession: (sessionId) => request('/table_sessions/cancel', {
    method: 'POST',
    body: JSON.stringify({ sessionId })
  }),
};

