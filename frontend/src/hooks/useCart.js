import { useState, useMemo } from 'react';

import { api } from '../api';

import {currency, isCategoryAvailable, toSentenceCase} from '../utils/helpers';

export default function useCart(user,activeTable) {

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
  try {
    const data = await api.getOrders('held');
    console.log("SUCCESS! Loaded Rich Rows:", data);
    setHeldOrders(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("Failed to load rich held orders array:", err);
    setHeldOrders([]);
  }
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
      const addonsLineTotal = (item.addons || []).reduce((sum, a) => 
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

  function buildCartItem(product, selectedAddons = [], qty = 1) {
    const basePrice = Number(product.price_cents ?? product.base_price_cents ?? 0);
    
    const addonTotal = selectedAddons.reduce((sum, a) => sum + Number(a.price_cents || 0), 0);
    const addonKey = selectedAddons.map(a => a.id).sort().join('-');
    const cartItemId = `${product.id}-${addonKey || 'no-addons'}-${Math.random().toString(36).substr(2, 9)}`;

    const courseMap = { 0: "Starter", 1: "Main", 2: "Dessert", 3: "Drinks" };

    return {
      cart_item_id: cartItemId,
      product_id: product.id,
      product_name: product.name,
      qty: qty,
      base_price_cents: basePrice,
      unit_price_cents: basePrice + addonTotal,
      vat_percent: Number(product.vat_percent || 0),
      is_discountable: product.is_discountable,
      note: product.note || "",
      course: product.course || courseMap[product.category_type] || "Main",
      addons: selectedAddons,
      category_type: product.category_type
    };
  }
  
  function executeAdd(product, selectedAddons = [], isEditingId = null) {
  const newItem = buildCartItem(product, selectedAddons);
  
  setCart((current) => {
    // 1. If we are explicitly modifying an existing line item, swap it out directly!
    if (isEditingId) {
      return current.map((item) => 
        item.cart_item_id === isEditingId 
          ? { 
              ...newItem, 
              cart_item_id: isEditingId, // Maintain original tracking ID
              qty: item.qty // Maintain original quantity
            } 
          : item
      );
    }

    // 2. Otherwise, treat as a normal add action
    const existing = current.find((item) => 
      item.product_id === newItem.product_id && 
      JSON.stringify(item.addons) === JSON.stringify(newItem.addons)
    );

    if (existing) {
      return current.map((item) => 
        item.cart_item_id === existing.cart_item_id ? { ...item, qty: item.qty + 1 } : item
      );
    }
    return [...current, newItem];
  });
}
// function executeAdd(product, selectedAddons = []) {
//   const addonTotal = selectedAddons.reduce((sum, a) => sum + a.price_cents, 0);
  
//   setCart((current) => {
//     // We treat products with different add-ons as unique line items
//     // So we generate a unique key based on selections
//     const addonKey = selectedAddons.map(a => a.id).sort().join('-');
//     const cartItemId = `${product.id}-${addonKey}`;

//     const existing = current.find((item) => item.cart_item_id === cartItemId);
//     if (existing) {
//       return current.map((item) => 
//         item.cart_item_id === cartItemId ? { ...item, qty: item.qty + 1 } : item
//       );
//     }

//     const courseMap = { 0: "Starter", 1: "Main", 2: "Dessert", 3: "Drinks" };


//     const defaultCourse = courseMap[product.category_type] || "Main";


//     return [...current, {
//       cart_item_id: cartItemId, // Unique ID for specific configuration
//       product_id: product.id,
//       product_name: product.name,
//       qty: 1,
//       base_price_cents: product.price_cents, // Keep base price separate
//       unit_price_cents: product.price_cents + addonTotal,
//       vat_percent: product.vat_percent,
//       is_discountable: product.is_discountable,
//       note: "",
//       course: defaultCourse,
//       addons: selectedAddons, // Structured data
//       category_type: product.category_type // Keep for re-editing
//     }];
//   });
// }

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

  function updateCartNote(cartItemId, note) { // <-- Change from productId to cartItemId
    setCart(current => current.map(item => 
      item.cart_item_id === cartItemId ? { ...item, note } : item
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
  if (!cart.length || !user) return;
  
  try {
    const existingOrderId = activeTable?.order_id || null;

    await api.holdOrder({ 
      user_id: user.id, 
      items: cart, 
      order_type: activeTable ? 'dine-in' : 'walk_in',
      order_id: existingOrderId,
      // ADD THESE NEW PAYLOAD FIELDS:
      discount_percent: discount,
      deposit_amount_cents: currentDepositCents
    });
    
    setCart([]);
    setDiscount(0);
    setDepositInput("");
    
    await loadHeldOrders(); 
    alert('Order held successfully!');
  } catch (err) {
    console.error("Failed to hold order:", err);
    alert(err.message);
  }
}

  async function loadHeldOrder(orderId) {
  const order = await api.getOrder(orderId);

  const parseAddons = (addons) => {
    if (!addons) return [];
    if (Array.isArray(addons)) return addons;
    try { return JSON.parse(addons); } catch (e) { return []; }
  };
  
  const restoredCart = order.items.map(item => {
    const parsedAddons = parseAddons(item.addons);
    const addonKey = parsedAddons.map(a => a.id).sort().join('-');
    const stableCartItemId = item.cart_item_id || `${item.product_id}-${addonKey || 'no-addons'}`;
    const courseMap = { 0: "Starter", 1: "Main", 2: "Dessert", 3: "Drinks" };

    return {
      cart_item_id: stableCartItemId,
      product_id: item.product_id,
      product_name: item.product_name,
      qty: item.qty,
      base_price_cents: item.base_price_cents || item.unit_price_cents,
      unit_price_cents: item.unit_price_cents,
      vat_percent: item.vat_percent,
      is_discountable: item.is_discountable,
      note: item.note || "",
      course: item.course || courseMap[item.category_type] || "Main",
      addons: parsedAddons,
      category_type: item.category_type
    };
  });

  setCart(restoredCart); 
  
  // RESTORE SAVED DISCOUNTS AND DEPOSITS BACK TO STATE
  if (order.discount_percent) {
    setDiscount(Number(order.discount_percent));
  } else {
    setDiscount(0);
  }

  if (order.deposit_amount_cents) {
    // Convert cents back to string decimals for your text input field box format
    setDepositInput((order.deposit_amount_cents / 100).toFixed(2));
  } else {
    setDepositInput("");
  }

  await api.cancelOrder(orderId); 
  await loadHeldOrders();
  return true;
}


  async function payNow({ amount_paid_cents, method }, activeTable) { // <--- Add activeTable here
  if (!user) return alert("Error: No user logged in");
  try {
    const orderData = {
      order_id: activeTable?.order_id || null,
      user_id: user.id,
      items: cart,
      discount_percent: discount,
      discount_total_cents: totals.discountAmountCents,
      deposit_amount_cents: currentDepositCents,
      subtotal_cents: totals.subtotalCents,
      vat_total_cents: totals.totalVatCents,
      grand_total_cents: totals.orderGrandTotal,
      amount_paid_cents: amount_paid_cents,
      payment_method: method
    };

    const res = await api.payOrder(orderData);
    
    // Only try to close the session if this was a table order
    // if (activeTable && activeTable.session_id) {
    //    await api.closeTableSession(activeTable.session_id);
    // }

    if (activeTable?.session_id) {
      await api.closeTableSession(activeTable.session_id);
    }

    setCart([]);
    setDiscount(0);
    setDepositInput("");
    setPaying(false);
    
    alert(`Order #${res.order_no} Paid! Change: ${currency(res.change_due_cents)}`);

    // These need to be handled by a callback or passed in if you want to switch views here
    // Better yet, return 'true' so App.jsx can handle the navigation
    return { success: true }; 

  } catch (e) {
    alert("Payment failed: " + e.message);
    return { success: false };
  }
}

  function updateItemCourse(cartItemId, course) { // <-- Change from productId to cartItemId
    setCart(current => current.map(item => 
      item.cart_item_id === cartItemId ? { ...item, course } : item
    ));
  }

  async function editCartItem(item) {
    try {
      const mappedCategories = await fetch(`http://localhost:4000/product-addons/${item.product_id}`).then(res => res.json());
      const allItems = await api.getAddonItems();
      
      const categoriesWithItems = mappedCategories.map(cat => ({
        ...cat,
        items: allItems
          .filter(addon => addon.category_id === cat.id)
          .map(addon => ({ 
            ...addon, 
            category_name: cat.name 
          }))
      }))
      .filter(cat => cat.items.length > 0);

      // Open modal but pass the existing selections
      setAddonModal({ 
        show: true, 
        product: { 
          id: item.product_id, 
          name: item.product_name, 
          price_cents: item.base_price_cents, // explicitly pass base_price_cents as price_cents
          category_type: item.category_type 
        }, 
        categories: categoriesWithItems,
        existingSelections: item.addons || [],
        isEditing: item.cart_item_id 
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