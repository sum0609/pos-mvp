import React, { useState, useEffect } from 'react';

import { api, toCents, fromCents } from '../api';

export default function CancelledOrdersScreen() {
  const [orders, setOrders] = useState([]);
  useEffect(() => { api.getOrders('cancelled').then(setOrders); }, []);

  return (
    <div className="card">
      <h3>Cancelled Orders</h3>
      <table className="data-table">
        <thead>
          <tr><th>Order #</th><th>Reason/Note</th><th>Date</th><th>Total Loss</th></tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id}>
              <td>#{o.order_no}</td>
              <td className="muted">Voided Transaction</td>
              <td>{new Date(o.created_at).toLocaleString()}</td>
              <td className="danger">-{currency(o.grand_total_cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!orders.length && <div className="empty">No cancelled orders found.</div>}
    </div>
  );
}