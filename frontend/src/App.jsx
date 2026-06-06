import { useEffect, useMemo, useState } from 'react';
import { api, toCents, fromCents } from './api';
import MenusScreen from './screens/MenusScreen';
import CategoriesScreen from './screens/CategoriesScreen';
import ProductsScreen from './screens/ProductsScreen';
import TableSettingsScreen from './screens/TableSettingsScreen';
import AddonCategoryScreen from './screens/AddonCategoryScreen';
import AddonListScreen from './screens/AddonListScreen';
import ProductAddonMapping from './screens/ProductAddonMapping';
import StaffScreen from './screens/StaffScreen';
import ReportsScreen from './screens/ReportsScreen';
import POS from './screens/POS';
import FloorPlan from './components/FloorPlan';
import CancelledOrdersScreen from './screens/CancelledOrdersScreen';
import HeldOrdersScreen from './screens/HeldOrdersScreen';

import Sidebar from './components/Sidebar';
import PaymentModal from './components/PaymentModal';
import Topbar from './components/Topbar';

import useCart from './hooks/useCart';
import {currency, isCategoryAvailable, toSentenceCase} from './utils/helpers';

function Login({ onLogin }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  async function submit() {
    try {
      const user = await api.login(pin);
      onLogin(user);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="login-shell">
      <div className="card login-card">
        <h1>POS Login</h1>
        <p>Use manager PIN <b>1234</b> or staff PIN <b>1111</b></p>
        <input
          className="input"
          placeholder="4-digit PIN"
          value={pin}
          maxLength={4}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        {error && <div className="error">{error}</div>}
        <button className="btn primary" onClick={submit}>Login</button>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('pos');
  const [menus, setMenus] = useState([]);
  const [activeMenu, setActiveMenu] = useState('');
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [products, setProducts] = useState([]);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const [now, setNow] = useState(new Date());

  const [activeTable, setActiveTable] = useState(null);
  const [tables, setTables] = useState([]);

  const { cart, setCart, heldOrders, setHeldOrders, paying, setPaying, discount, setDiscount, 
    deposit, setDeposit, depositInput, setDepositInput, depositCents, setDepositCents, currentDepositCents,
    loadHeldOrders, totals, addToCart, removeFromCart, changeQty, updateCartNote, handleClearCart, 
    holdCurrentOrder, loadHeldOrder, payNow, updateItemCourse, addonModal, setAddonModal, executeAdd,editCartItem } = useCart(user, activeTable);


  // const [posView, setPosView] = useState('floorplan');

  const [posState, setPosState] = useState({
    mode: 'floorplan',
    context: null
  });

  const goFloorplan = async () => {
    await fetchTables();
    setCart([]);
    setActiveTable(null);

    setPosState({
      mode: 'floorplan',
      context: { type: 'floorplan', data: null }
    });
  };

  const goWalkin = () => {
    setCart([]);
    setActiveTable(null);

    setPosState({
      mode: 'order',
      context: { type: 'walkin', data: null }
    });
  };

  const goHeld = () => {
    setPosState({
      mode: 'held',
      context: { type: 'held', data: null }
    });
  };

  const getContextLabel = () => {
    switch (posState.context?.type) {
      case 'table':
        return `${posState.context.data.name} • ${posState.context.data.covers} Covers`;
      case 'walkin':
        return 'Walk-in Order';
      case 'held':
        return 'Held Order';
      default:
        return '';
    }
  };

  const handleHeldSelect = async (order) => {
  try {
    // 1. Wait for useCart to finish rebuilding and restoring the items array 
    const success = await loadHeldOrder(order.id);

    if (success) {
      // 2. Safely route back to standard POS billing layout
      setPosState({
        mode: 'order', // Points back to the live terminal grid view
        context: {
          type: order.table_id ? 'table' : 'walk_in',
          data: {
            ...order,
            name: order.table_name || `Table ${order.table_id}`,
            id: order.table_id
          }
        }
      });
    }
  } catch (err) {
    console.error("Failed to resume held order cleanly:", err);
    alert("Could not load held order details.");
  }
};

  const handleBackToFloor = async () => {
    await resetToFloor();
  };

  async function fetchTables() {
  try {
    const data = await api.getTables_din_in();
    setTables(data);
  } catch (err) {
    console.error("Failed to fetch real-time table status:", err);
  }
}

const handleFloorPlanClick = async () => {
  await fetchTables();
  setActiveTable(null);
  setCart([]);
  // setPosView('floorplan');
};

const handleTakeAwayOrder = () => {
  setActiveTable(null); // Ensure no table is linked
  setCart([]);          // Start with a fresh cart
  // setPosView('walkin');       // Go straight to the ordering screen
  setScreen('pos');
};
  
const handleTableSelect = async (table) => {
  let session = null;
  let covers = null;

  if (table.status === 'available') {
    while (true) {
      const input = window.prompt(
        `Enter number of customers for ${table.name} (Max ${table.capacity}):`,
        "2"
      );

      if (input === null) return; // user cancelled

      covers = parseInt(input, 10);

      if (Number.isNaN(covers) || covers <= 0) {
        alert("Please enter a valid number greater than 0.");
        continue;
      }

      if (covers > table.capacity) {
        alert(`This table only allows maximum ${table.capacity} customers.`);
        continue;
      }

      break;
    }

    try {
      session = await api.createTableSession({
        table_id: table.id,
        covers,
        user_id: user.id
      });

      setActiveTable({
        ...table,
        session_id: session.id,
        order_id: session.order_id,
        covers
      });

      setCart([]);
    } catch (err) {
      alert("Could not start table session.");
      return;
    }
  } else {
    try {
      const response = await api.getOrderByTable(table.id);

      setActiveTable({
        ...table,
        session_id: response.session_id,
        order_id: response.order_id
      });

      setCart(response.items || []);
    } catch (err) {
      alert("Could not load order.");
      return;
    }
  }

  setPosState({
    mode: 'order',
    context: {
      type: 'table',
      data: {
        ...table,
        session_id: session?.id ?? table.session_id,
        order_id: session?.order_id ?? table.order_id,
        covers: covers ?? table.covers
      }
    }
  });
};

const resetToFloor = async () => {
  await fetchTables();
  setCart([]);
  setActiveTable(null);
  setPosState({
    mode: 'floorplan',
    context: null
  });
};

const handleCancelTable = async () => {
  if (!activeTable?.session_id) return;

  if (!window.confirm(`Are you sure you want to cancel the session for ${activeTable.name}? This will delete the current order.`)) return;

  try {
    await api.cancelTableSession(activeTable.session_id);
    await resetToFloor();
  } catch (err) {
    alert(err.message);
  }
};

  const availableCategories = useMemo(() => {
    if (screen !== 'pos') return categories;
    return categories.filter(cat => 
      isCategoryAvailable(cat.available_from, cat.available_to)
    );
  }, [categories, now, screen]);
  
  const availableMenus = useMemo(() => {
    if (screen !== 'pos') return menus;

    return menus.filter(m =>
      availableCategories.some(cat => cat.menu_id === m.id)
    );
  }, [menus, availableCategories, screen]);

  // Load Initial Data
  useEffect(() => {
    if (user) {
      loadMenus();
      loadAllCategories(); // Load everything so ProductsScreen has the full list
      loadHeldOrders();
    }
  }, [user]);
;
useEffect(() => {
  if (user && posState.mode === 'held') {
    console.log("Navigated to Held Orders screen: Fetching latest orders...");
    loadHeldOrders();
  }
}, [posState.mode, user]);

  // Sync Products when Category changes
  useEffect(() => {
    if (activeCategory) loadProducts(activeCategory);
  }, [activeCategory]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const available = categories.filter(cat => isCategoryAvailable(cat.available_from, cat.available_to));
    const currentIsStillAvailable = available.find(cat => cat.id === activeCategory);
    
    if (!currentIsStillAvailable && available.length > 0) {
      setActiveCategory(available[0].id);
      loadProducts(available[0].id); // Make sure products update too!
    }
  }, [now, categories]);

  useEffect(() => {
    if (screen !== 'pos') return;

    const isStillValid = availableMenus.some(m => m.id === activeMenu);

    if (!isStillValid && availableMenus.length > 0) {
      setActiveMenu(availableMenus[0].id);
    }
  }, [availableMenus, activeMenu, screen]);

  // Auto-select first category when activeMenu changes
useEffect(() => {
  // 1. Get categories for the current menu, sorted by sort_order
  const menuCategories = availableCategories
    .filter(cat => cat.menu_id === activeMenu)
    .sort((a, b) => a.sort_order - b.sort_order);

  // 2. If we have categories and the current activeCategory isn't in this list
  if (menuCategories.length > 0) {
    const isStillValid = menuCategories.some(cat => cat.id === activeCategory);
    
    if (!isStillValid) {
      // 3. Select the first one automatically
      setActiveCategory(menuCategories[0].id);
      loadProducts(menuCategories[0].id); // Force-load products for this ID
    }
  } else {
    // Optional: Clear category if menu has none
    setActiveCategory('');
  }
}, [activeMenu, availableCategories]);

// Add a useEffect to sync cart with the database session
useEffect(() => {
    // Only sync if there is an active table session AND items in the cart
    if (activeTable?.session_id && cart.length > 0 && typeof api.syncTableOrder === 'function') {
        api.syncTableOrder(activeTable.session_id, cart).catch(err => {
            console.error("Auto-sync failed:", err);
        });
    }
}, [cart, activeTable]);

useEffect(() => {
    fetchTables();
  }, []);

  async function loadMenus() {
    const data = await api.getMenus();
    setMenus(data);
    if (data.length > 0 && !activeMenu) setActiveMenu(data[0].id);
  }

  async function loadAllCategories() {
    const data = await api.getCategories(); // Call without an ID to get ALL
    setCategories(data);
  }

  async function loadProducts(categoryId = activeCategory) {
    const data = await api.getProductsWithFlags(categoryId || undefined);
    setProducts(data);
  }

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="app-shell">
      <Sidebar screen={screen} setScreen={setScreen} onLogout={() => setUser(null)} />

      <main className="content">
        <Topbar
          screen={screen}
          user={user}
          availableMenus={availableMenus}
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          setScreen={setScreen}
          onLogout={() => setUser(null)}
          // posView={posView}
          // setPosView={setPosView}
          onWalkinClick={handleTakeAwayOrder}
          onFloorPlanClick={handleFloorPlanClick}
          posState={posState} 
          goFloorplan={goFloorplan}
          goWalkin={goWalkin} 
          goHeld={goHeld}
        />
        {/* <Topbar 
          screen={screen}
          user={user}
          availableMenus={availableMenus} // Pass your filtered menus here
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          setScreen={setScreen}
          onLogout={() => setUser(null)}
        /> */}

        {/* <div className="action-bar" style={{ padding: '10px' }}>
          <button className="btn primary" onClick={handleTakeAwayOrder}>
            Walk-In
          </button>
        </div> */}

        {/* {screen === 'pos' && (
          posView === 'floorplan' ? (
            <FloorPlan 
              tables={tables} 
              onSelectTable={handleTableSelect} 
              currency={currency} // pass your helper
            />
          ) : (posView === 'held' ? (
            <HeldOrdersScreen heldOrders={heldOrders} onResume={loadHeldOrder} refresh={loadHeldOrders} />
          ):(
            <POS availableCategories={availableCategories}
              activeMenu={activeMenu}
              activeCategory={activeCategory}
              products={products}
              cart={cart}
              totals={totals}
              discount={discount}
              depositInput={depositInput}
              currentDepositCents={currentDepositCents}
              setActiveCategory={setActiveCategory}
              addToCart={addToCart}
              removeFromCart={removeFromCart}
              changeQty={changeQty}
              updateCartNote={updateCartNote}
              setDiscount={setDiscount}
              setDepositInput={setDepositInput}
              handleClearCart={handleClearCart}
              holdCurrentOrder={holdCurrentOrder}
              setPaying={setPaying}
              currency={currency}
              toSentenceCase={toSentenceCase}
              updateItemCourse={updateItemCourse}
              addonModal={addonModal}
              setAddonModal={setAddonModal}
              executeAdd={executeAdd}
              editCartItem={editCartItem}
              activeTable={activeTable}
              onBackToFloor={handleBackToFloor}
              handleCancelTable = {handleCancelTable}
              posView={posView}
              setPosView={setPosView}
              availableMenus={availableMenus}
              setActiveMenu={setActiveMenu} />
        )))} */}

        {screen === 'pos' && (
  <>
    {/* FLOOR PLAN */}
    {posState.mode === 'floorplan' && (
      <FloorPlan
        tables={tables}
        onSelectTable={handleTableSelect}
        currency={currency}
      />
    )}

    {/* HELD ORDERS */}
    {posState.mode === 'held' && (
      <HeldOrdersScreen
        heldOrders={heldOrders}
        onResume={handleHeldSelect} 
        refresh={loadHeldOrders}
        posContext={posState.context}
        onBackToFloor={goFloorplan}
        getContextLabel={getContextLabel}
        handleCancelTable={handleCancelTable}
      />
    )}

    {/* ORDER SCREEN */}
    {posState.mode === 'order' && (
      <POS
        availableCategories={availableCategories}
              activeMenu={activeMenu}
              activeCategory={activeCategory}
              products={products}
              cart={cart}
              totals={totals}
              discount={discount}
              depositInput={depositInput}
              currentDepositCents={currentDepositCents}
              setActiveCategory={setActiveCategory}
              addToCart={addToCart}
              removeFromCart={removeFromCart}
              changeQty={changeQty}
              updateCartNote={updateCartNote}
              setDiscount={setDiscount}
              setDepositInput={setDepositInput}
              handleClearCart={handleClearCart}
              holdCurrentOrder={holdCurrentOrder}
              setPaying={setPaying}
              currency={currency}
              toSentenceCase={toSentenceCase}
              updateItemCourse={updateItemCourse}
              addonModal={addonModal}
              setAddonModal={setAddonModal}
              executeAdd={executeAdd}
              editCartItem={editCartItem}
              activeTable={activeTable}
              handleCancelTable = {handleCancelTable}
              // posView={posView}
              // setPosView={setPosView}
              availableMenus={availableMenus}
              setActiveMenu={setActiveMenu}
        posContext={posState.context}
        onBackToFloor={goFloorplan}
        getContextLabel={getContextLabel}
      />
    )}
  </>
)}

        {screen === 'menus' && (<MenusScreen menus={menus} refreshMenus={loadMenus}/>)}
        {screen === 'categories' && (<CategoriesScreen categories={categories} menus={menus} activeMenu={activeMenu} setActiveMenu={setActiveMenu} refreshCategories={loadAllCategories}/>)}         
        {screen === 'products' && <ProductsScreen menus={menus} categories={categories} activeMenu={activeMenu}  setActiveMenu={setActiveMenu} refreshProducts={loadProducts} />}         
        {screen === 'tables' && <TableSettingsScreen />}
        {screen === 'addon_categories' && <AddonCategoryScreen />}
        {screen === 'addon_list' && <AddonListScreen />}
        {screen === 'product_addon_map' && <ProductAddonMapping />}
        {screen === 'staff' && <StaffScreen />}         
        {screen === 'reports' && <ReportsScreen />}
        {/* {screen === 'held' && <HeldOrdersScreen heldOrders={heldOrders} onResume={loadHeldOrder} refresh={loadHeldOrders} />} */}
        {screen === 'cancel' && <CancelledOrdersScreen  />}
      </main>

      {paying && (
        <PaymentModal 
          onConfirm={(data) => payNow(data, activeTable)}
          user={user}
          totalCents={totals.balanceDue} 
          onClose={() => setPaying(false)} 
          onPay={payNow} 
        />
      )}
    </div>
  );
}

export default App;
