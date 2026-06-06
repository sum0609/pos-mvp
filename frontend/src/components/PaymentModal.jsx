import { useState, useEffect, useMemo } from 'react';
import { api, toCents, fromCents } from '../api';

import {currency, isCategoryAvailable, toSentenceCase} from '../utils/helpers';

export default function PaymentModal({ user, totalCents, onClose, onPay, onConfirm }) {
  const [method, setMethod] = useState('card'); // 'card' or 'cash'
  const [receivedInput, setReceivedInput] = useState(fromCents(totalCents));
  // const [tipInput, setTipInput] = useState("0");

  const receivedCents = Math.round((parseFloat(receivedInput) || 0) * 100);
  // const tipCents = Math.round((parseFloat(tipInput) || 0) * 100);
  
  // Logic: Change is only for Cash. Tips can be on both.
  const changeCents = method === 'cash' ? Math.max(0, receivedCents - totalCents) : 0;
  const finalPayable = totalCents ;//+ tipCents;

  return (
    <div className="modal-backdrop">
      <div className="modal card payment-modal">
        <div className="modal-header">
          <h3>Settlement</h3>
          <button className="close-x" onClick={onClose}>×</button>
        </div>

        <div className="payment-summary">
          <div className="summary-item">
            <span>Balance Due</span>
            <strong>{currency(totalCents)}</strong>
          </div>
        </div>

        {/* Method Toggle */}
        <div className="method-selector">
          <button 
            className={`method-btn ${method === 'card' ? 'active' : ''}`}
            onClick={() => { setMethod('card'); setReceivedInput(fromCents(totalCents)); }}
          >
            💳 Card
          </button>
          <button 
            className={`method-btn ${method === 'cash' ? 'active' : ''}`}
            onClick={() => setMethod('cash')}
          >
            💵 Cash
          </button>
        </div>

        <div className="payment-inputs">
          <div className="input-field">
            <label>{method === 'cash' ? 'Cash Received' : 'Card Amount'}</label>
            <input 
              className="input large" 
              type="number" 
              value={receivedInput}
              onChange={(e) => setReceivedInput(e.target.value)}
              onFocus={(e) => e.target.select()}
            />
          </div>

          {/* <div className="input-field">
            <label>Add Tip (£)</label>
            <input 
              className="input large tip-input" 
              type="number" 
              placeholder="0.00"
              value={tipInput}
              onChange={(e) => setTipInput(e.target.value)}
            />
          </div> */}
        </div>

        {/* Change Display (Only for Cash) */}
        {method === 'cash' && changeCents > 0 && (
          <div className="change-display">
            <span>Change to Return:</span>
            <strong>{currency(changeCents)}</strong>
          </div>
        )}

        <div className="modal-footer">
          
          <button 
            className="btn primary settle-btn" 
            // onClick={() => onPay({
            //   amount_paid_cents: receivedCents,
            //   // tip_cents: tipCents,
            //   method: method
            // })}
            onClick={() => onConfirm({ // <--- Use onConfirm instead of onPay
              amount_paid_cents: receivedCents,
              method: method
            })}
          >
            Complete {currency(finalPayable)}
          </button>
          <button className="btn primary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}