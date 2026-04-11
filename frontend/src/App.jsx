import { useEffect, useMemo, useState } from 'react';
import { api, toCents, fromCents } from './api';
import MenusScreen from './screens/MenusScreen';
import CategoriesScreen from './screens/CategoriesScreen';
import ProductsScreen from './screens/ProductsScreen';
import TableSettingsScreen from './screens/TableSettingsScreen';
import AddonCategoryScreen from './screens/AddonCategoryScreen';
import AddonListScreen from './screens/AddonListScreen';
import StaffScreen from './screens/StaffScreen';
import ReportsScreen from './screens/ReportsScreen';
import POS from './screens/POS';
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

  const { cart, setCart, heldOrders, setHeldOrders, paying, setPaying, discount, setDiscount, 
    deposit, setDeposit, depositInput, setDepositInput, depositCents, setDepositCents, currentDepositCents,
    loadHeldOrders, totals, addToCart, removeFromCart, changeQty, updateCartNote, handleClearCart, 
    holdCurrentOrder, loadHeldOrder, payNow, updateItemCourse } = useCart(user);





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
          availableMenus={availableMenus} // Pass your filtered menus here
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          setScreen={setScreen}
          onLogout={() => setUser(null)}
        />

        {screen === 'pos' && (
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
            updateItemCourse={updateItemCourse} />
        )}

        {screen === 'menus' && (<MenusScreen menus={menus} refreshMenus={loadMenus}/>)}
        {screen === 'categories' && (<CategoriesScreen categories={categories} menus={menus} activeMenu={activeMenu} setActiveMenu={setActiveMenu} refreshCategories={loadAllCategories}/>)}         
        {screen === 'products' && <ProductsScreen menus={menus} categories={categories} activeMenu={activeMenu}  setActiveMenu={setActiveMenu} refreshProducts={loadProducts} />}         
        {screen === 'tables' && <TableSettingsScreen />}
        {screen === 'addon_categories' && <AddonCategoryScreen />}
        {screen === 'addon_list' && <AddonListScreen />}
        {screen === 'staff' && <StaffScreen />}         
        {screen === 'reports' && <ReportsScreen />}
        {screen === 'held' && <HeldOrdersScreen heldOrders={heldOrders} onResume={loadHeldOrder} refresh={loadHeldOrders} />}
        {screen === 'cancel' && <CancelledOrdersScreen  />}
      </main>

      {paying && (
        <PaymentModal 
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
