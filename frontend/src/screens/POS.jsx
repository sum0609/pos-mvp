

import React from 'react';
import AddonModal from '../components/AddonModal';

export default function POS({
  // Data
  availableCategories,
  activeMenu,
  activeCategory,
  products,
  cart,
  totals,
  discount,
  depositInput,
  currentDepositCents,
  // Actions
  setActiveCategory,
  addToCart,
  removeFromCart,
  changeQty,
  updateCartNote,
  setDiscount,
  setDepositInput,
  handleClearCart,
  holdCurrentOrder,
  setPaying,
  // Utils
  currency,
  toSentenceCase, 
  updateItemCourse, addonModal, setAddonModal, executeAdd, editCartItem
}) {
  return (
    <> {/* Start Fragment */}
    {addonModal.show && (
      <AddonModal 
        modalData={addonModal}
        onClose={() => setAddonModal({ show: false })}
        onConfirm={(product, selections) => {
            // 1. If we are editing, remove the SPECIFIC old row first
            if (addonModal.isEditing) {
                removeFromCart(addonModal.isEditing, true); // Use the 'silent' flag we created
            }
          executeAdd(product, selections);
          setAddonModal({ show: false });
        }}
        currency={currency}
      />
    )}
  <div className="pos-main-container">

    <div className="pos-layout">
        {/* 2. Side Panel: Categories (Filtered by activeMenu) */}
        <div className="categories-panel">
        {availableCategories
            .filter(cat => cat.menu_id === activeMenu)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((cat) => (
            <button
                key={cat.id}
                className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
                style={
                cat.color && cat.color !== '#ffffff'
                    ? { '--cat-color': cat.color }
                    : {}
                }
                onClick={() => setActiveCategory(cat.id)}
            >
                {cat.name}
            </button>
            ))}
        </div>

        {/* 3. Middle Panel: Product Grid (Filtered by activeCategory) */}
        <div className="products-panel card">
        <div className="product-grid">
            {products.map((product) => (
            <button 
                key={product.id} 
                className="product-card" 
                style={
                product.color && product.color !== '#ffffff'
                    ? { '--product-color': product.color }
                    : {}
                }
                onClick={() => addToCart(product)}
            >
                <strong>{toSentenceCase(product.name)}</strong>
                <div className="price-tag">{currency(product.price_cents)}</div>
            </button>
            ))}
            {products.length === 0 && (
            <div className="empty-state">No products in this category</div>
            )}
        </div>
        </div>

        {/* 4. Right Panel: Cart */}
        <div className="cart-panel card">
        <div className="panel-title">Current Order</div>
        <div className="cart-items">
            {cart.map((item) => (
                <div key={item.cart_item_id} className="cart-item">
                <button className="btn-delete" onClick={() => removeFromCart(item.cart_item_id)}>×</button>

                <div className="cart-item-main">
                    <div className="cart-item-left">
                        <div className='flex-row justify-between'>
                        <strong className="product-name" onClick={() => editCartItem(item)} style={{cursor: 'pointer'}}>
                            {toSentenceCase(item.product_name)} ✏️
                        </strong>
                        <span className="unit-price">{currency(item.base_price_cents)}</span>
                        </div>

                        {/* Treeview Add-ons */}
                        {item.addons && item.addons.length > 0 && (
                        <div className="cart-item-treeview">
                            {Object.values(
                            item.addons.reduce((acc, addon) => {
                                const catName = addon.category_name || "Add-ons"; 
                                if (!acc[catName]) acc[catName] = { name: catName, items: [] };
                                acc[catName].items.push(addon);
                                return acc;
                            }, {})
                            ).map((group) => (
                            <div key={group.name} className="treeview-group">
                                <div className="treeview-header">└─ {group.name}</div>
                                <div className="treeview-items">
                                {group.items.map((addon) => (
                                    <div key={addon.id} className="treeview-item flex-row justify-between text-sm">
                                    <span className="ml-4">• {addon.name}</span>
                                    <span className="price-addon">{currency(addon.price_cents)}</span>
                                    </div>
                                ))}
                                </div>
                            </div>
                            ))}
                        </div>
                        )}

                        {/* NEW: Textarea and Qty in the same row */}
                        <div className="flex-row align-center gap-2 mt-2">
                        <textarea 
                            className="note-textarea flex-grow"
                            placeholder="Add kitchen notes..."
                            value={item.note || ""}
                            rows={item.note && item.note.split('\n').length > 1 ? 2 : 1}
                            onChange={(e) => updateCartNote(item.cart_item_id, e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.stopPropagation(); }}
                        />
                        
                        <div className="qty-box-inline">
                            <button className="qty-btn" onClick={() => changeQty(item.cart_item_id, -1)}>−</button>
                            <span className="qty-number">{item.qty}</span>
                            <button className="qty-btn" onClick={() => changeQty(item.cart_item_id, 1)}>+</button>
                        </div>
                        </div>

                        <div className="course-selector">
                        {['Starter', 'Main', 'Dessert', 'Drinks'].map((courseName) => (
                            <button
                            key={courseName}
                            className={`course-btn ${item.course === courseName ? 'active' : ''}`}
                            onClick={() => updateItemCourse(item.cart_item_id, courseName)}
                            >
                            {courseName[0]}
                            </button>
                        ))}
                        </div>
                    </div>
                    </div>
                </div>
            ))}
        </div>

        <div className="discount-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ whiteSpace: 'nowrap' }}>Discount:</span>
            
            <div className="preset-buttons">
                {[0, 5, 10, 20].map(val => (
                    <button 
                        key={val}
                        type="button"
                        className={`btn-pill ${discount === val ? 'active' : ''}`}
                        style={{ flexShrink: 0 }} // Ensures buttons don't shrink
                        onClick={() => setDiscount(val)}
                    >
                        {val}%
                    </button>
                ))}
                
                {/* Custom Input Field */}
                <div className="custom-input-wrapper">
                    <input 
                        type="number" 
                        className="input-inline"
                        placeholder="0"
                        /* React style object: use a number or string without !important */
                        style={{ width: '45px', textAlign: 'center' }} 
                        value={![0, 5, 10, 20].includes(discount) ? discount : ''}
                        onChange={(e) => setDiscount(Number(e.target.value))}
                    />
                    <span>%</span>
                </div>
            </div>
        </div>

        <div className="deposit-section">
            <div className="input-group">
            <span>Deposit:</span>
                <span className="input-prefix">£</span>
                <input 
                type="number" 
                className="input" 
                placeholder="0.00" 
                value={depositInput}
                onChange={(e) => setDepositInput(e.target.value)}
                />
            </div>
            {/* {currentDepositCents > 0 && (
            <div className="deposit-hint">
                <small className="text-success">
                Deducting {currency(currentDepositCents)} from total
                </small>
            </div>
            )} */}
        </div>
        
        <div className="totals">
            <div className="total-line">
            <span>Subtotal</span>
            <span>{currency(totals.subtotalCents)}</span>
            </div>

            {discount > 0 && (
            <div className="total-line discount-row">
                <span>Discount ({discount}%) 
                <small className="muted"> (Excl. Drinks)</small>
                </span>
                <span>-{currency(totals.discountAmountCents)}</span>
            </div>
            )}

            {/* {deposit > 0 && (
            <div className="total-line deposit-row">
                <span>Deposit Paid</span>
                <span>-{currency(deposit)}</span>
            </div>
            )} */}
            {/* {depositCents > 0 && (
            <div className="total-line deposit-row">
                <span>Deposit Paid</span>
                <span>-{currency(depositCents)}</span> 
            </div>
            )} */}

            <div className="total-line">
            <span>VAT</span>
            <span>{currency(totals.totalVatCents)}</span>
            </div>

            <div className="total-line grand-total-row">
            <span>Grand Total</span>
            <strong>{currency(totals.orderGrandTotal)}</strong>
            </div>

            <hr className="divider" />

            {currentDepositCents > 0 && (
            <div className="total-line deposit-deduction">
                <span>Less Deposit</span>
                <span className="text-success">-{currency(currentDepositCents)}</span>
            </div>
            )}

            <div className="payable-box">
            <div className="payable-label">Amount to Pay</div>
            <div className="payable-amount">{currency(totals.balanceDue)}</div>
            </div>
        </div>

        <div className="actions-grid">
            {/* <button 
            className="btn danger" 
            onClick={() => {
                if (window.confirm("Are you sure you want to clear the cart and all inputs?")) {
                setCart([]);
                setDiscount(0);
                setDepositInput("");
                }
            }}
            >
            Clear
            </button> */}
            <button className="btn danger" onClick={handleClearCart}>
            Clear
            </button>
            <button className="btn warning" onClick={holdCurrentOrder} disabled={!cart.length}>Hold</button>
            <button className="btn primary" disabled={!cart.length} onClick={() => setPaying(true)}>Pay Now {currency(totals.balanceDue)}</button>
        </div>
        </div>
    </div>
    </div>
    </> /* End Fragment */
);
}