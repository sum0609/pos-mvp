import { currency, toSentenceCase } from '../utils/helpers';

export default function HeldOrdersScreen({ 
  heldOrders = [], onResume, posContext, onBackToFloor, getContextLabel, handleCancelTable
}) {
  const ordersList = Array.isArray(heldOrders) ? heldOrders : [];
  return (
    <div className="card">
      <div className="pos-header-nav">
        <div className="active-table-info">
          <h3>{getContextLabel ? getContextLabel() : 'Held Orders'}</h3>
        </div>

        {/* RIGHT SIDE: ACTION BUTTON */}
        {posContext?.type && (
          <div style={{ display: 'flex', gap: '10px' }}>
            {/* BACK (safe) */}
            <button className="btn" onClick={onBackToFloor}>
              ← Back
            </button>

            {/* CANCEL TABLE (danger) */}
            {/* {posContext.type === 'table' && (
              <button className="btn danger" onClick={handleCancelTable}>
                Cancel & Clear Table
              </button>
            )} */}
          </div>
        )}
      </div>

      <div className="simple-list">
        {!ordersList.length && <div className="empty-state">No held orders.</div>}
        
        {ordersList.map((order) => {
          const isTableOrder = !!(order.table_name || order.table_id);
          console.log("table", order.table_id, order.table_name)
          // Check if it's tied to a table context
          // const isTableOrder = !!(order.table_id || order.table_name);

          return (
            <div key={order.id} className="held-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', padding: '12px 8px', borderBottom: '1px solid #eee' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '1.1rem' }}>Order #{order.order_no}</strong>
                  
                  {/* SOURCE TYPE BADGES */}
                  {isTableOrder ? (
                    <span className="badge table-badge" style={{ backgroundColor: '#e3f2fd', color: '#0d47a1', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      🪑 {order.table_name || `Table ${order.table_id}`}
                    </span>
                  ) : (
                    <span className="badge walkin-badge" style={{ backgroundColor: '#e8f5e9', color: '#1b5e20', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      🏃 Walk-in
                    </span>
                  )}
                </div>
                
                <span className="muted" style={{ fontSize: '0.9rem', color: '#666' }}>
                  Total: {currency(order.grand_total_cents || order.grand_total || 0)}
                </span>
              </div>

              <button className="btn primary" onClick={() => onResume(order)}>
                Resume →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}