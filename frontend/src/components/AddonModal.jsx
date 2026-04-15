import { useState, useEffect } from 'react';
import { api } from '../api';

export default function AddonModal({ modalData, onClose, onConfirm, currency }) {
  const { product, categories } = modalData;
//   const [selections, setSelections] = useState([]);

  const [selections, setSelections] = useState(modalData.existingSelections || []);

    const handleConfirm = () => {
    if (modalData.isEditing) {
        // If editing, we need to remove the old cart item first
        removeFromCart(modalData.isEditing, true); // Add a 'silent' flag so it doesn't confirm
    }
    onConfirm(modalData.product, selections);
    };

  const toggleAddon = (category, item) => {
    const isAlreadySelected = selections.find(s => s.id === item.id);
    if (category.selection_type === 'single') {
        if (isAlreadySelected) {
        // If already selected, remove it (allow none)
        setSelections(prev => prev.filter(a => a.id !== item.id));
        } else {
            // Remove others from same category, add new
            setSelections(prev => [
                ...prev.filter(a => a.category_id !== category.id),
                item
            ]);
        }
    } else {
      // Toggle checkbox style
      setSelections(prev => 
        isAlreadySelected
          ? prev.filter(a => a.id !== item.id) 
          : [...prev, item]
      );
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content addon-selection">
        <h2>Customize {product.name}</h2>
        <div className="addon-body">
          {categories.map(cat => (
            <div key={cat.id} className="addon-group">
              <h4>{cat.name} <small>({cat.selection_type})</small></h4>
              <div className="addon-grid">
                {cat.items.map(item => (
                  <button 
                    key={item.id}
                    className={`addon-item-btn ${selections.find(s => s.id === item.id) ? 'active' : ''}`}
                    onClick={() => toggleAddon(cat, item)}
                  >
                    <span>{item.name}</span>
                    <small>+{currency(item.price_cents)}</small>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => onConfirm(product, selections)}>
            Add to Order
          </button>
        </div>
      </div>
    </div>
  );
}