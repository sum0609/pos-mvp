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

  const [addonModal, setAddonModal] = useState({ show: false, product: null, categories: [] });


  async function loadHeldOrders() {
    setHeldOrders(await api.getOrders('held'));
  }

  // --- Cart Logic (Using Cents) ---
  // const totals = useMemo(() => {
  //       const discountable = cart.filter(item => item.is_discountable !== 0);
  //       const nonDiscountable = cart.filter(item => item.is_discountable === 0);

  //       const discSubtotal = discountable.reduce((sum, item) => sum + (item.qty * item.unit_price_cents), 0);
  //       const nonDiscSubtotal = nonDiscountable.reduce((sum, item) => sum + (item.qty * item.unit_price_cents), 0);

  //       const discountAmount = Math.round(discSubtotal * (discount / 100));
    
  //       const vat = cart.reduce((sum, item) => {
  //       console.log(item);
  //       const lineTotal = item.qty * item.unit_price_cents;
  //       let priceAfterDiscount = lineTotal;

  //       if (item.is_discountable !== 0) {
  //           // Apply the global discount % to this specific line item
  //           priceAfterDiscount = lineTotal * (1 - (discount / 100));
  //       }

  //       const itemVat = Math.round(priceAfterDiscount * (item.vat_percent / 100));
  //       return sum + itemVat;
  //       }, 0);

  //       const subtotal = (discSubtotal + nonDiscSubtotal) - discountAmount;
  //       // const grandTotal = subtotal + vat - currentDepositCents;
  //       const orderGrandTotal = subtotal + vat; // The "Actual" total
  //       const balanceDue = orderGrandTotal - currentDepositCents; // The "Payable" amount

  //       return { 
  //       discountableCents: discSubtotal,
  //       nonDiscountableCents: nonDiscSubtotal,
  //       discountAmountCents: discountAmount,
  //       totalVatCents: vat,
  //       subtotalCents: subtotal,
  //       orderGrandTotal, // Full value
  //       balanceDue: Math.max(0, balanceDue) // Final amount to pay
  //       };
  //   }, [cart, discount, depositInput]);

  const totals = useMemo(() => {
    const calculation = cart.reduce((acc, item) => {
      // Calculate base total for this line
      const baseLineTotal = item.qty * item.base_price_cents;
      
      // Calculate addons total for this line
      const addonsLineTotal = item.addons.reduce((sum, a) => 
        sum + (item.qty * a.price_cents), 0
      );

      const combinedLineTotal = baseLineTotal + addonsLineTotal;

      // Standard VAT/Discount logic applied to combinedLineTotal
      let priceAfterDiscount = combinedLineTotal;
      if (item.is_discountable !== 0) {
        priceAfterDiscount = combinedLineTotal * (1 - (discount / 100));
      }

      acc.subtotal += combinedLineTotal;
      acc.vat += Math.round(priceAfterDiscount * (item.vat_percent / 100));
      acc.discountTotal += Math.round(combinedLineTotal * (item.is_discountable !== 0 ? discount / 100 : 0));
      
      return acc;
    }, { subtotal: 0, vat: 0, discountTotal: 0 });

    const orderGrandTotal = calculation.subtotal + calculation.vat - calculation.discountTotal;

    return {
      subtotalCents: calculation.subtotal,
      totalVatCents: calculation.vat,
      discountAmountCents: calculation.discountTotal,
      orderGrandTotal,
      balanceDue: Math.max(0, orderGrandTotal - currentDepositCents)
    };
  }, [cart, discount, depositInput]);


  async function addToCart(product) {
    // 1. Fetch mapped add-on categories for this product
    try {
      const mappedCategories = await fetch(`http://localhost:4000/product-addons/${product.id}`).then(res => res.json());

      if (mappedCategories.length > 0) {
        // 2. If add-ons exist, show modal instead of adding to cart
        // We need to fetch the actual items for these categories too
        const allItems = await api.getAddonItems();
        const categoriesWithItems = mappedCategories.map(cat => ({
          ...cat,
          items: allItems
            .filter(item => item.category_id === cat.id)
            .map(item => ({ 
              ...item, 
              category_name: cat.name // Add this line to attach the name
            }))
        }))
        .filter(cat => cat.items.length > 0);

        // If after filtering we still have categories, show modal
        if (categoriesWithItems.length > 0) {
            setAddonModal({ show: true, product, categories: categoriesWithItems });
        } else {
            executeAdd(product, []); // No valid addons found, add product directly
        }

        // setAddonModal({ show: true, product, categories: categoriesWithItems });
      } else {
        // 3. No add-ons, proceed as normal
        executeAdd(product, []);
      }
    } catch (err) {
      console.error("Failed to check add-ons", err);
      executeAdd(product, []); // Fallback
    }

    // setCart((current) => {
    //   const existing = current.find((item) => item.product_id === product.id);
    //   if (existing) {
    //     return current.map((item) => 
    //       item.product_id === product.id ? { ...item, qty: item.qty + 1 } : item
    //     );
    //   }
    //   const courseMap = {
    //     0: "Starter",
    //     1: "Main",
    //     2: "Dessert",
    //     3: "Drinks"
    //   };

    //   const defaultCourse = courseMap[product.category_type] || "Main";

    //   return [...current, {
    //     product_id: product.id,
    //     product_name: product.name,
    //     qty: 1,
    //     unit_price_cents: product.price_cents, // Match backend
    //     vat_percent: product.vat_percent,
    //     is_discountable: product.is_discountable,
    //     note: "",
    //     course: defaultCourse
    //   }];
    // });
  }

  // Helper to actually push to cart state
function executeAdd(product, selectedAddons = []) {
  const addonTotal = selectedAddons.reduce((sum, a) => sum + a.price_cents, 0);
  
  setCart((current) => {
    // We treat products with different add-ons as unique line items
    // So we generate a unique key based on selections
    const addonKey = selectedAddons.map(a => a.id).sort().join('-');
    const cartItemId = `${product.id}-${addonKey}`;

    const existing = current.find((item) => item.cart_item_id === cartItemId);
    if (existing) {
      return current.map((item) => 
        item.cart_item_id === cartItemId ? { ...item, qty: item.qty + 1 } : item
      );
    }

    const courseMap = { 0: "Starter", 1: "Main", 2: "Dessert", 3: "Drinks" };


    const defaultCourse = courseMap[product.category_type] || "Main";


    return [...current, {
      cart_item_id: cartItemId, // Unique ID for specific configuration
      product_id: product.id,
      product_name: product.name,
      qty: 1,
      base_price_cents: product.price_cents, // Keep base price separate
      unit_price_cents: product.price_cents + addonTotal,
      vat_percent: product.vat_percent,
      is_discountable: product.is_discountable,
      note: "",
      course: defaultCourse,
      addons: selectedAddons, // Structured data
      category_type: product.category_type // Keep for re-editing
    }];
  });
}

  const removeFromCart = (cartItemId, silent = false) => {
    if (silent) {
      setCart((current) => current.filter((item) => item.cart_item_id !== cartItemId));
    } else {
      if (window.confirm("Remove this item from the cart?")) {
        setCart((current) => current.filter((item) => item.cart_item_id !== cartItemId));
      }
    }
  };

  function changeQty(cartItemId, delta) {
  setCart(current => current
    .map(item => item.cart_item_id === cartItemId ? { ...item, qty: item.qty + delta } : item)
    .filter(item => item.qty > 0)
  );
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

  async function editCartItem(item) {
    try {
      const mappedCategories = await fetch(`http://localhost:4000/product-addons/${item.product_id}`).then(res => res.json());
      const allItems = await api.getAddonItems();
      
      const categoriesWithItems = mappedCategories.map(cat => ({
        ...cat,
        items: allItems
          .filter(item => item.category_id === cat.id)
          .map(item => ({ 
            ...item, 
            category_name: cat.name // Add this line to attach the name
          }))
      }))
      .filter(cat => cat.items.length > 0);

      // Open modal but pass the existing selections
      setAddonModal({ 
        show: true, 
        product: { id: item.product_id, name: item.product_name, price_cents: item.base_price_cents, category_type: item.category_type }, 
        categories: categoriesWithItems,
        existingSelections: item.addons,
        isEditing: item.cart_item_id // Track which specific line we are editing
      });
    } catch (err) {
      console.error("Edit failed", err);
    }
  }

  return { cart, setCart, heldOrders, setHeldOrders, paying, setPaying, discount, setDiscount, 
    deposit, setDeposit, depositInput, setDepositInput, depositCents, setDepositCents, currentDepositCents,
    loadHeldOrders, totals, addToCart, removeFromCart, changeQty, updateCartNote, handleClearCart, 
    holdCurrentOrder, loadHeldOrder, payNow, updateItemCourse, addonModal, setAddonModal, executeAdd, editCartItem };
}