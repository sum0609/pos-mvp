import { useState, useEffect } from 'react';
import { api } from '../api';

export default function ProductAddonMapping() {
    // Data lists
  const [menus, setMenus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [allAddonCats, setAllAddonCats] = useState([]);

  // Selection states
  const [activeMenu, setActiveMenu] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [mappedIds, setMappedIds] = useState([]);

  useEffect(() => {
    api.getMenus().then(setMenus);
    api.getCategories().then(setCategories);
    api.getProducts().then(setProducts);
    api.getAddonCategories().then(setAllAddonCats);
  }, []);

  // When product changes, load its specific mappings
  useEffect(() => {
    if (selectedProductId) {
      fetch(`http://localhost:4000/product-addons/${selectedProductId}`)
        .then(res => res.json())
        .then(data => setMappedIds(data.map(cat => cat.id)));
    } else {
      setMappedIds([]);
    }
  }, [selectedProductId]);

  const filteredCategories = categories.filter(c => !activeMenu || c.menu_id === activeMenu);
  const filteredProducts = products.filter(p => !activeCategory || p.category_id === activeCategory);

  const toggleCategory = (catId) => {
    setMappedIds(prev => 
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const saveMapping = async () => {
    if (!selectedProductId) return;
    await fetch(`http://localhost:4000/product-addons/${selectedProductId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryIds: mappedIds })
    });
    alert("Mappings saved successfully!");
  };

  return (
    <div className="split-grid">
      <div className="card">
        <h3>1. Find Product</h3>
        
        <label className="muted text-sm">Menu Filter</label>
        <select className="input" value={activeMenu} onChange={(e) => {
          setActiveMenu(e.target.value);
          setActiveCategory(''); // Reset sub-filters
          setSelectedProductId('');
        }}>
          <option value="">-- All Menus --</option>
          {menus.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        <label className="muted text-sm">Category Filter</label>
        <select className="input" value={activeCategory} onChange={(e) => {
          setActiveCategory(e.target.value);
          setSelectedProductId('');
        }}>
          <option value="">-- All Categories --</option>
          {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <label className="muted text-sm">Select Product</label>
        <select className="input" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
          <option value="">-- Choose a Product --</option>
          {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="card">
        <h3>2. Assign Add-on Categories</h3>
        <p className="muted text-sm mb-4">Check the groups that apply to this product:</p>
        
        <div className="simple-list">
          {allAddonCats.map(cat => (
            <label key={cat.id} className="held-row flex-row items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={mappedIds.includes(cat.id)} 
                onChange={() => toggleCategory(cat.id)}
              />
              <div>
                <strong>{cat.name}</strong>
                <div className="muted text-xs">{cat.selection_type} selection</div>
              </div>
            </label>
          ))}
        </div>

        <button 
          className="btn primary mt-4 w-full" 
          onClick={saveMapping}
          disabled={!selectedProductId}
        >
          Save Assignment
        </button>
      </div>
    </div>
  );
}