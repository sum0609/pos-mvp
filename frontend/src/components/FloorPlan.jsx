
import React from 'react';

export default function FloorPlan({ tables, onSelectTable, currency }) {
  return (
    <div className="floor-plan-container">
      <div className="table-grid-layout">
        {tables.map((table) => (
          <div 
            key={table.id} 
            className={`table-card-v2 ${table.status}`} 
            onClick={() => onSelectTable(table)}
          >
            <div className="table-card-header">
              <span className="table-name">{table.name}</span>
              <span className={`status-badge ${table.status}`}>{table.status}</span>
            </div>

            {/* Visual Seat Representation */}
            <div className="seats-container">
              {[...Array(table.capacity)].map((_, i) => (
                <div key={i} className="seat-dot"></div>
              ))}
            </div>

            {table.status === 'occupied' && (
              <div className="table-card-footer">
                <span className="covers-count">👥 {table.covers || 0}</span>
                <span className="table-bill-summary">{currency(table.current_total || 0)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}