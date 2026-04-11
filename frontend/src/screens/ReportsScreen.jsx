import { useState, useEffect, useMemo } from 'react';
import { api, toCents, fromCents } from '../api';

import {currency, isCategoryAvailable, toSentenceCase} from '../utils/helpers';

export default function ReportsScreen() {
  const today = new Date().toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({ start: today, end: today });
  const [data, setData] = useState({ summary: [], detailed: [] });
  const [view, setView] = useState('summary'); // 'summary' or 'detailed'

  useEffect(() => {
    fetchReport();
  }, [dateRange]);

  async function fetchReport() {
    const res = await api.getSalesReport(dateRange.start, dateRange.end);
    setData(res);
  }

  const grandTotal = data.summary.reduce((sum, row) => sum + row.total_gross, 0);

  return (
    <div className="reports-container card">
      <header className="report-header">
        <h2>Sales Reports</h2>
        <div className="date-controls">
          <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
          <span>to</span>
          <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
        </div>
      </header>

      <div className="report-tabs">
        <button className={view === 'summary' ? 'active' : ''} onClick={() => setView('summary')}>Summary (Orders)</button>
        <button className={view === 'detailed' ? 'active' : ''} onClick={() => setView('detailed')}>Detailed (Products)</button>
      </div>

      {view === 'summary' ? (
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Method</th>
                <th>Orders</th>
                <th>Discounts</th>
                <th>Deposits Used</th>
                <th>Subtotal</th>
                <th>VAT</th>
                <th>Gross Total</th>
                <th>Money Collected</th>
              </tr>
            </thead>
            <tbody>
              {data.summary.map((row, i) => (
                <tr key={i}>
                  <td>{row.payment_method?.toUpperCase()}</td>
                  <td>{row.order_count}</td>
                  <td className="text-danger">-{currency(row.total_discounts)}</td>
                  <td className="text-info">{currency(row.total_deposits)}</td>
                  <td>{currency(row.total_subtotal)}</td>
                  <td>{currency(row.total_vat)}</td>
                  <td><strong>{currency(row.total_order_value)}</strong></td>
                  <td><strong>{currency(row.total_collected)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="report-footer">
            Total Revenue: {currency(grandTotal)}
          </div>
        </div>
      ) : (
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Qty Sold</th>
                <th>Unit Price</th>
                <th>Total Discount</th>
                <th>Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.detailed.map((item, i) => (
                <tr key={i}>
                  <td>{item.product_name}</td>
                  <td>{item.total_qty}</td>
                  <td>{currency(item.unit_price_cents)}</td>
                  <td className="text-danger">
                    {item.total_discount_given > 0 ? `-${currency(item.total_discount_given)}` : '-'}
                  </td>
                  <td>{currency(item.total_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}