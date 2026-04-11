import { useState, useMemo } from 'react';

import { api } from '../api';

import {currency, isCategoryAvailable, toSentenceCase} from '../utils/helpers';

export default function useCart(user) {

  const [cart, setCart] = useState([]);

  const [heldOrders, setHeldOrders] = useState([]);
  const [paying, setPaying] = useState(false);
  
  const [discount, setDiscount] = useState(0); // 0 to 100
  const [deposit, setDeposit] = useState("");
  const [depositInput, setDepositInput] = useState(""); // String for the input field
  const [depositCents, setDepositCents] = useState(0);

  const currentDepositCents = Math.round((parseFloat(depositInput) || 0) * 100);


  async function loadHeldOrders() {
    setHeldOrders(await api.getOrders('held'));
  }

  // --- Cart Logic (Using Cents) ---
  const totals = useMemo(() => {
        const discountable = cart.filter(item => item.is_discountable !== 0);
        const nonDiscountable = cart.filter(item => item.is_discountable === 0);

        const discSubtotal = discountable.reduce((sum, item) => sum + (item.qty * item.unit_price_cents), 0);
        const nonDiscSubtotal = nonDiscountable.reduce((sum, item) => sum + (item.qty * item.unit_price_cents), 0);

        const discountAmount = Math.round(discSubtotal * (discount / 100));
    
        const vat = cart.reduce((sum, item) => {
        console.log(item);
        const lineTotal = item.qty * item.unit_price_cents;
        let priceAfterDiscount = lineTotal;

        if (item.is_discountable !== 0) {
            // Apply the global discount % to this specific line item
            priceAfterDiscount = lineTotal * (1 - (discount / 100));
        }

        const itemVat = Math.round(priceAfterDiscount * (item.vat_percent / 100));
        return sum + itemVat;
        }, 0);

        const subtotal = (discSubtotal + nonDiscSubtotal) - discountAmount;
        // const grandTotal = subtotal + vat - currentDepositCents;
        const orderGrandTotal = subtotal + vat; // The "Actual" total
        const balanceDue = orderGrandTotal - currentDepositCents; // The "Payable" amount

        return { 
        discountableCents: discSubtotal,
        nonDiscountableCents: nonDiscSubtotal,
        discountAmountCents: discountAmount,
        totalVatCents: vat,
        subtotalCents: subtotal,
        orderGrandTotal, // Full value
        balanceDue: Math.max(0, balanceDue) // Final amount to pay
        };
    }, [cart, discount, depositInput]);


  function addToCart(product) {
    setCart((current) => {
      const existing = current.find((item) => item.product_id === product.id);
      if (existing) {
        return current.map((item) => 
          item.product_id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      const courseMap = {
        0: "Starter",
        1: "Main",
        2: "Dessert",
        3: "Drinks"
      };

      const defaultCourse = courseMap[product.category_type] || "Main";

      return [...current, {
        product_id: product.id,
        product_name: product.name,
        qty: 1,
        unit_price_cents: product.price_cents, // Match backend
        vat_percent: product.vat_percent,
        is_discountable: product.is_discountable,
        note: "",
        course: defaultCourse
      }];
    });
  }

  const removeFromCart = (productId) => {
    if (window.confirm("Remove this item from the cart?")) {
      setCart((current) => current.filter((item) => item.product_id !== productId));
    }
  };

  function changeQty(productId, delta) {
    setCart((current) => current
      .map((item) => item.product_id === productId ? { ...item, qty: item.qty + delta } : item)
      .filter((item) => item.qty > 0));
  }

  function updateCartNote(productId, note) {
    setCart(current => current.map(item => 
      item.product_id === productId ? { ...item, note } : item
    ));
  }

  const handleClearCart = () => {
    const isConfirmed = window.confirm("Clear all items and discounts?");
    
    if (isConfirmed) {
      setCart([]);
      setDiscount(0);
      setDepositInput("");
    }
  };
  
  async function holdCurrentOrder() {
    if (!cart.length|| !user) return;
    await api.holdOrder({ user_id: user.id, items: cart, order_type: 'walk_in' });
    setCart([]);
    loadHeldOrders();
    alert('Order held');
  }

  async function loadHeldOrder(orderId) {
    const order = await api.getOrder(orderId);
    setCart(order.items.map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      qty: item.qty,
      unit_price: item.unit_price,
      vat_percent: item.vat_percent,
      is_discountable: item.is_discountable,
      note: ""
    })));
    await api.cancelOrder(orderId);
    loadHeldOrders();
    setScreen('pos');
  }

  async function payNow({ amount_paid_cents, method }) {
    if (!user) return alert("Error: No user logged in");
    try {
      const orderData = {
        user_id: user.id,
        items: cart, // The array containing notes, qty, etc.
        
        // Global Totals from your totals useMemo
        discount_percent: discount,
        discount_total_cents: totals.discountAmountCents,
        deposit_amount_cents: currentDepositCents,
        
        subtotal_cents: totals.subtotalCents,
        vat_total_cents: totals.totalVatCents,
        grand_total_cents: totals.orderGrandTotal,
        
        // Payment details
        amount_paid_cents: amount_paid_cents, // e.g., the £20 note they handed you
        payment_method: method
      };

      const res = await api.payOrder(orderData);
      
      // Success: Clear everything
      setCart([]);
      setDiscount(0);
      setDepositInput("");
      setPaying(false);
      alert(`Order #${res.order_no} Paid! Change: ${currency(res.change_due_cents)}`);
    } catch (e) {
      alert("Payment failed: " + e.message);
    }
  } 

  function updateItemCourse(productId, course) {
    setCart(current => current.map(item => 
      item.product_id === productId ? { ...item, course } : item
    ));
  }
  return { cart, setCart, heldOrders, setHeldOrders, paying, setPaying, discount, setDiscount, 
    deposit, setDeposit, depositInput, setDepositInput, depositCents, setDepositCents, currentDepositCents,
    loadHeldOrders, totals, addToCart, removeFromCart, changeQty, updateCartNote, handleClearCart, 
    holdCurrentOrder, loadHeldOrder, payNow, updateItemCourse };
}