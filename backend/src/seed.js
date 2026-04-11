import { db } from './db.js';
import crypto from 'crypto';

// 1. SEED USERS
const countUsers = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
if (countUsers === 0) {
  const users = [
    ['u1', 'admin', 'Admin', 'User', '1234', 'manager', 'active'],
    ['u2', 'cashier', 'Front', 'Staff', '1111', 'staff', 'active']
  ];
  const stmt = db.prepare('INSERT INTO users (id, username, first_name, last_name, pin, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const row of users) stmt.run(...row);
}

// 2. SEED MENUS (Required for Category Foreign Key)
const countMenus = db.prepare('SELECT COUNT(*) AS count FROM menus').get().count;
if (countMenus === 0) {
  db.prepare("INSERT INTO menus (id, name, is_active, is_discountable) VALUES (?, ?, ?, ?)").run('m1', 'Day Menu', 1, 1);
  db.prepare("INSERT INTO menus (id, name, is_active, is_discountable) VALUES (?, ?, ?, ?)").run('m2', 'Evening Menu', 1, 1);
  db.prepare("INSERT INTO menus (id, name, is_active, is_discountable) VALUES (?, ?, ?, ?)").run('m3', 'Drinks Menu', 1, 0);
  db.prepare("INSERT INTO menus (id, name, is_active, is_discountable) VALUES (?, ?, ?, ?)").run('m4', 'Kids Menu', 1, 1);
}

// 3. SEED CATEGORIES
const countCategories = db.prepare('SELECT COUNT(*) AS count FROM categories').get().count;
if (countCategories === 0) {
  const categories = [
    // m1: Day Menu
    ['c1', 'm1', 'Cakes/Tray Bakes', '#ffffff', 1, 1, 1],
    ['c2', 'm1', 'Breakfast', '#fee2e2', 2, 1, 1],
    ['c3', 'm1', 'Brunch', '#ffffff', 3, 1, 1],
    ['c4', 'm1', 'Lunch', '#ffffff', 4, 1, 1],
    // m2: Evening Menu
    ['c5', 'm2', 'Nibbles', '#ffffff', 1, 1, 1],
    ['c6', 'm2', 'Small Plates', '#ffffff', 2, 1, 1],
    ['c7', 'm2', 'Sharing Plates', '#ffffff', 3, 1, 1],
    ['c8', 'm2', 'Large Plates', '#ffffff', 4, 1, 1],
    ['c9', 'm2', 'Pasta Dishes', '#ffffff', 5, 1, 1],
    ['c10', 'm2', 'Burgers', '#ffffff', 6, 1, 1],
    ['c11', 'm2', 'Side Order', '#ffffff', 7, 1, 1],
    ['c12', 'm2', 'Desserts', '#ffffff', 8, 1, 1],
    // m3: Drinks Menu
    ['c13', 'm3', 'Hot Drinks', '#ffffff', 1, 1, 0],
    ['c14', 'm3', 'Freshly Squeezed Juices', '#ffffff', 2, 1, 0],
    ['c15', 'm3', 'Teas', '#ffffff', 3, 1, 0],
    ['c16', 'm3', 'Cold Coffee', '#ffffff', 4, 1, 0],
    ['c17', 'm3', 'Milkshakes', '#ffffff', 5, 1, 0],
    ['c18', 'm3', 'Smoothies', '#ffffff', 6, 1, 0],
    ['c19', 'm3', 'Soft Drinks', '#ffffff', 7, 1, 0],
    ['c20', 'm3', 'Beers and Ciders', '#ffffff', 8, 1, 0],
    ['c21', 'm3', 'Spirits & Liqueurs', '#ffffff', 9, 1, 0],
    ['c22', 'm3', 'Wines', '#ffffff', 10, 1, 0],
    ['c23', 'm3', 'Cocktails', '#ffffff', 11, 1, 0],
    // m4: Kids Menu
    ['c24', 'm4', 'Kids Drinks', '#ffffff', 1, 1, 1],
    ['c25', 'm4', 'Kids Daytime', '#ffffff', 2, 1, 1],
    ['c26', 'm4', 'Kids Evening', '#ffffff', 3, 1, 1]
  ];
  const stmt = db.prepare('INSERT INTO categories (id,menu_id, name, color, sort_order, is_active, is_discountable) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const row of categories) stmt.run(...row);
}

// 4. SEED PRODUCTS (Converting Prices to Cents)
const countProducts = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;
if (countProducts === 0) {
  const products = [
    // [ID, CatID, Name, Price_Cents, VAT, Barcode, Color, IsActive]
    // --- m1: DAY MENU ---
    // c1: Cakes/Tray Bakes
    ['p1', 'c1', 'CHOCOLATE BROWNIE (GF)', 375, 20.0, '101', '#ffffff', 1], 
    ['p2', 'c1', 'FLAP JACK', 375, 20.0, '102', '#ffffff', 1], 
    ['p3', 'c1', 'CAKES', 475, 20.0, '103', '#ffffff', 1], 
    ['p4', 'c1', 'SCONE WITH BUTTER', 395, 20.0, '104', '#ffffff', 1], 
    ['p5', 'c1', 'CHEESE SCONE WITH BUTTER', 395, 20.0, '105', '#ffffff', 1], 
    ['p6', 'c1', 'SCONE WITH CLOTTED CREAM, JAM AND BUTTER', 595, 20.0, '106', '#ffffff', 1], 

    // c2: Breakfast
    ['p7', 'c2', 'PORRIDGE', 650, 20.0, '201', '#fee2e2', 1], 
    ['p8', 'c2', 'SAUSAGE BRIOCHE ROLL', 650, 20.0, '202', '#fee2e2', 1], 
    ['p9', 'c2', 'BACON BRIOCHE ROLL', 650, 20.0, '203', '#fee2e2', 1], 
    ['p10', 'c2', 'BRIOCHE FRENCH TOAST', 850, 20.0, '204', '#fee2e2', 1], 
    ['p11', 'c2', 'PANCAKES', 950, 20.0, '205', '#fee2e2', 1], 
    ['p12', 'c2', 'AKURI ON TOASTED COB BREAD', 950, 20.0, '206', '#fee2e2', 1], 
    ['p13', 'c2', 'BERT', 1050, 20.0, '207', '#fee2e2', 1], 
    ['p14', 'c2', 'EGGS ANY WAY WITH AVOCADO', 1050, 20.0, '208', '#fee2e2', 1], 

    // c3: Brunch
    ['p15', 'c3', 'MERIENDA FELL WALKER BREAKFAST', 1550, 20.0, '301', '#ffffff', 1], 
    ['p16', 'c3', 'HUNTER', 1250, 20.0, '302', '#ffffff', 1], 
    ['p17', 'c3', 'GATHERER (VEG)', 1250, 20.0, '303', '#ffffff', 1], 
    ['p18', 'c3', 'MASALA SCRAMBLED TOFU (V)', 1250, 20.0, '304', '#ffffff', 1], 
    ['p19', 'c3', 'EGGS ROYALE', 1250, 20.0, '305', '#ffffff', 1], 
    ['p20', 'c3', 'GARLIC MUSHROOM', 1250, 20.0, '306', '#ffffff', 1], 
    ['p21', 'c3', 'HUEVOS RANCHEROS', 1250, 20.0, '307', '#ffffff', 1], 
    ['p22', 'c3', 'CORN FRITTERS (VEG, GF)', 1250, 20.0, '308', '#ffffff', 1], 
    ['p23', 'c3', 'GRILLED HALLOUMI (VEG, GFA)', 1250, 20.0, '309', '#ffffff', 1], 

    // c4: Lunch
    ['p24', 'c4', 'SOUP OF THE DAY (CIABATTA)', 750, 20.0, '401', '#ffffff', 1], 
    ['p25', 'c4', 'SOUP OF THE DAY (SCONE)', 1100, 20.0, '402', '#ffffff', 1], 
    ['p26', 'c4', 'GRILLED CHEESE, LEEK AND ONION (VEG)', 1150, 20.0, '403', '#ffffff', 1], 
    ['p27', 'c4', 'THE REUBEN', 1250, 20.0, '404', '#ffffff', 1], 
    ['p28', 'c4', 'STEAK STRIPS, ONION AND CHEESE SANDWICH', 1550, 20.0, '405', '#ffffff', 1], 
    ['p29', 'c4', 'SALAD BOWL (VEG, V)', 1395, 20.0, '406', '#ffffff', 1], 
    ['p30', 'c4', 'VEGETABLE BURGER (VEG)', 1395, 20.0, '407', '#ffffff', 1], 
    ['p31', 'c4', 'CLASSIC FALAFEL (VEG, V)', 1395, 20.0, '408', '#ffffff', 1], 
    ['p32', 'c4', 'PULLED PORK BURGER', 1595, 20.0, '409', '#ffffff', 1], 

    // --- m2: EVENING MENU ---
    // c5: Nibbles
    ['p33', 'c5', 'WARM TOASTED CIABATTA', 500, 20.0, '501', '#ffffff', 1], 
    ['p34', 'c5', 'HUMMUS', 500, 20.0, '502', '#ffffff', 1], 
    ['p35', 'c5', 'OLIVES (V, VEG)', 500, 20.0, '503', '#ffffff', 1], 
    ['p36', 'c5', 'PARDON PEPPERS (GF, V, VEG)', 500, 20.0, '504', '#ffffff', 1], 

    // c6: Small Plates
    ['p37', 'c6', 'MERIENDA CRISPY PATATA BRAVAS (VEG)', 600, 20.0, '601', '#ffffff', 1], 
    ['p38', 'c6', 'SCHEZWAN HALLOUMI (VEG)', 700, 20.0, '602', '#ffffff', 1], 
    ['p39', 'c6', 'CLASSIC FALAFEL (V, VEG)', 800, 20.0, '603', '#ffffff', 1], 
    ['p40', 'c6', 'BREADED WHITEBAIT', 900, 20.0, '604', '#ffffff', 1], 
    ['p41', 'c6', 'KOREAN CHICKEN WINGS (GF)', 900, 20.0, '605', '#ffffff', 1], 
    ['p42', 'c6', 'ALBONDIGAS (GF)', 1200, 20.0, '606', '#ffffff', 1], 
    ['p43', 'c6', 'PRAWNS PIL PIL (GFA)', 1300, 20.0, '607', '#ffffff', 1], 
    ['p44', 'c6', 'STEAK STRIPS (GFA)', 1500, 20.0, '608', '#ffffff', 1], 

    // c7: Sharing Plates
    ['p45', 'c7', 'FULLY LOADED NACHOS', 1000, 20.0, '701', '#ffffff', 1], 
    ['p46', 'c7', 'BRAISED KOREAN BEEF TACOS', 1200, 20.0, '702', '#ffffff', 1], 

    // c8: Large Plates (Specialties/Pasta)
    ['p47', 'c8', 'SIRLOIN STEAK (GF)', 2600, 20.0, '801', '#ffffff', 1], 
    ['p48', 'c8', 'BAKED LOCAL WHOLE SEA TROUT (GF)', 2100, 20.0, '802', '#ffffff', 1], 
    ['p49', 'c9', 'LINGUINI RATATOUILLE (GFA, V, VEG)', 1500, 20.0, '901', '#ffffff', 1], 
    ['p50', 'c9', 'TOMATO AND MEATBALL LINGUINI (GFA)', 1600, 20.0, '902', '#ffffff', 1], 

    // c10: Burgers
    ['p51', 'c10', 'CUMBRIAN BEEF BURGER', 1800, 20.0, '1001', '#ffffff', 1], 
    ['p52', 'c10', 'AMERICAN STYLE PULLED PORK BURGER (GFA)', 1700, 20.0, '1002', '#ffffff', 1], 
    ['p53', 'c10', 'SPANISH LAMB BURGER (GFA)', 1900, 20.0, '1003', '#ffffff', 1], 
    ['p54', 'c10', 'PORTUGESE PERI PERI CHICKEN BURGER', 1700, 20.0, '1004', '#ffffff', 1], 

    // c11: Side Order
    ['p55', 'c11', 'BOILED VEGETABLES', 400, 20.0, '1101', '#ffffff', 1], 
    ['p56', 'c11', 'HOMEMADE COLESLAW', 400, 20.0, '1102', '#ffffff', 1], 
    ['p57', 'c11', 'MIXED LEAF SALAD', 400, 20.0, '1103', '#ffffff', 1], 
    ['p58', 'c11', 'HAND CUT WEDGES', 400, 20.0, '1104', '#ffffff', 1], 
    ['p59', 'c11', 'GARLIC BREAD WITH CHEESE', 600, 20.0, '1105', '#ffffff', 1], 

    // c12: Desserts
    ['p60', 'c12', 'CARAMELIZED LEMON POSSET', 800, 20.0, '1201', '#ffffff', 1], 
    ['p61', 'c12', 'GF CHOCOLATE BROWNIE', 800, 20.0, '1202', '#ffffff', 1], 
    ['p62', 'c12', 'STICKY TOFFEE PUDDING', 800, 20.0, '1203', '#ffffff', 1], 
    ['p63', 'c12', 'CHOCOLATE AMARETTO FONDUE (SHARE)', 1400, 20.0, '1204', '#ffffff', 1], 
    ['p64', 'c12', 'ICE CREAM (1 SCOOP)', 375, 20.0, '1205', '#ffffff', 1], 
    ['p65', 'c12', 'ICE CREAM (2 SCOOPS)', 650, 20.0, '1206', '#ffffff', 1], 

    // --- m3: DRINKS MENU ---
    // c13: Hot Drinks
    ['p66', 'c13', 'ESPRESSO', 375, 20.0, '1301', '#ffffff', 1], 
    ['p67', 'c13', 'AMERICANO', 375, 20.0, '1302', '#ffffff', 1], 
    ['p68', 'c13', 'LATTE', 395, 20.0, '1303', '#ffffff', 1], 
    ['p69', 'c13', 'FLAT WHITE', 395, 20.0, '1304', '#ffffff', 1], 
    ['p70', 'c13', 'CAPPUCCINO', 395, 20.0, '1305', '#ffffff', 1], 
    ['p71', 'c13', 'CORTADO', 395, 20.0, '1306', '#ffffff', 1], 
    ['p72', 'c13', 'MACCHIATO', 450, 20.0, '1307', '#ffffff', 1], 
    ['p73', 'c13', 'AFFOGATO', 495, 20.0, '1308', '#ffffff', 1], 
    ['p74', 'c13', 'MOCHA', 475, 20.0, '1309', '#ffffff', 1], 
    ['p75', 'c13', 'HOT CHOCOLATE', 475, 20.0, '1310', '#ffffff', 1], 
    ['p76', 'c13', 'HOT CHOCOLATE DELIGHT', 495, 20.0, '1311', '#ffffff', 1], 
    ['p77', 'c13', 'BABYCCINO', 300, 20.0, '1312', '#ffffff', 1], 

    // c14: Freshly Squeezed Juices
    ['p78', 'c14', 'FRESH ORANGE JUICE', 495, 20.0, '1401', '#ffffff', 1], 
    ['p79', 'c14', 'ORANGE, ELDERFLOWER & MINT', 595, 20.0, '1402', '#ffffff', 1], 
    ['p80', 'c14', 'CARROT, APPLE & ORANGE', 595, 20.0, '1403', '#ffffff', 1], 
    ['p81', 'c14', 'RASPBERRY, APPLE & GINGER', 595, 20.0, '1404', '#ffffff', 1], 

    // c15: Teas
    ['p82', 'c15', 'ENGLISH BREAKFAST TEA', 395, 20.0, '1501', '#ffffff', 1], 
    ['p83', 'c15', 'EARL GREY TEA', 395, 20.0, '1502', '#ffffff', 1], 
    ['p84', 'c15', 'FRESH MINT TEA', 395, 20.0, '1503', '#ffffff', 1], 
    ['p85', 'c15', 'GREEN TEA', 395, 20.0, '1504', '#ffffff', 1], 
    ['p86', 'c15', 'STRAWBERRY & KIWI TEA', 395, 20.0, '1505', '#ffffff', 1], 

    // c16: Cold Coffee
    ['p87', 'c16', 'ICED LATTE', 450, 20.0, '1601', '#ffffff', 1], 
    ['p88', 'c16', 'FRAPPE COFFEE', 450, 20.0, '1602', '#ffffff', 1], 
    ['p89', 'c16', 'ICED VANILLA FRAPPE', 475, 20.0, '1603', '#ffffff', 1], 
    ['p90', 'c16', 'ICED CARAMEL MACCHIATO', 475, 20.0, '1604', '#ffffff', 1], 

    // c17: Milkshakes
    ['p91', 'c17', 'VANILLA MILKSHAKE', 550, 20.0, '1701', '#ffffff', 1], 
    ['p92', 'c17', 'CHOCOLATE MILKSHAKE', 550, 20.0, '1702', '#ffffff', 1], 
    ['p93', 'c17', 'STRAWBERRY MILKSHAKE', 550, 20.0, '1703', '#ffffff', 1], 
    ['p94', 'c17', 'COFFEE MILKSHAKE', 550, 20.0, '1704', '#ffffff', 1], 
    ['p95', 'c17', 'OREO MILKSHAKE', 625, 20.0, '1705', '#ffffff', 1], 

    // c18: Smoothies
    ['p96', 'c18', 'MANGO PINEAPPLE & PASSION FRUIT', 595, 20.0, '1801', '#ffffff', 1], 
    ['p97', 'c18', 'SUPER RED BERRY', 595, 20.0, '1802', '#ffffff', 1], 
    ['p98', 'c18', 'BANANA, AVOCADO, SPINACH & APPLE', 595, 20.0, '1803', '#ffffff', 1], 

    // c19: Soft Drinks
    ['p99', 'c19', 'COKE 330ML', 385, 20.0, '1901', '#ffffff', 1], 
    ['p100', 'c19', 'DIET COKE 330ML', 385, 20.0, '1902', '#ffffff', 1], 
    ['p101', 'c19', 'STILL WATER 330ML', 385, 20.0, '1903', '#ffffff', 1], 
    ['p102', 'c19', 'SPARKLING WATER 330ML', 385, 20.0, '1904', '#ffffff', 1], 
    ['p103', 'c19', 'FEVER TREE TONIC', 385, 20.0, '1905', '#ffffff', 1], 

    // c20: Beers and Ciders
    ['p104', 'c20', 'BIRRA MORETTI 330ML', 495, 20.0, '2001', '#ffffff', 1], 
    ['p105', 'c20', 'ESTRELLA DAMM 330ML', 495, 20.0, '2002', '#ffffff', 1], 
    ['p106', 'c20', 'WINDERMERE PALE ALE 500ML', 625, 20.0, '2003', '#ffffff', 1], 
    ['p107', 'c20', 'OLD MOUT BERRIES & CHERRIES 500ML', 625, 20.0, '2004', '#ffffff', 1], 

    // c21: Spirits & Liqueurs
    ['p108', 'c21', 'THE LAKES SINGLE MALT', 795, 20.0, '2101', '#ffffff', 1], 
    ['p109', 'c21', 'BAILEYS IRISH CREAM 50ML', 400, 20.0, '2102', '#ffffff', 1], 

    // c22: Wines
    ['p110', 'c22', 'CAMPO NUEVO WHITE (175ML)', 600, 20.0, '2201', '#ffffff', 1], 
    ['p111', 'c22', 'CAMPO NUEVO WHITE (BTL)', 2300, 20.0, '2202', '#ffffff', 1], 
    ['p112', 'c22', 'CAMPO NUEVO ROSE (BTL)', 2300, 20.0, '2203', '#ffffff', 1], 
    ['p113', 'c22', 'PROSECCO D.O.C. (20CL)', 950, 20.0, '2204', '#ffffff', 1], 
    ['p114', 'c22', 'PROSECCO D.O.C. (BTL)', 2700, 20.0, '2205', '#ffffff', 1], 

    // c23: Cocktails
    ['p115', 'c23', 'APEROL SPRITZ', 1000, 20.0, '2301', '#ffffff', 1], 
    ['p116', 'c23', 'MARGARITA', 1000, 20.0, '2302', '#ffffff', 1], 
    ['p117', 'c23', 'MOJITO', 1000, 20.0, '2303', '#ffffff', 1], 
    ['p118', 'c23', 'PASSION FRUIT MARTINI', 1000, 20.0, '2304', '#ffffff', 1], 
    ['p119', 'c23', 'ESPRESSO MARTINI', 1000, 20.0, '2305', '#ffffff', 1], 
    ['p120', 'c23', 'SHARING SANGRIA FOR 2', 1500, 20.0, '2306', '#ffffff', 1], 

    // --- m4: KIDS MENU ---
    // c24: Kids Drinks
    ['p121', 'c24', 'CHILLED MILK', 275, 20.0, '2401', '#ffffff', 1], 
    ['p122', 'c24', 'BABYCHINNO', 275, 20.0, '2402', '#ffffff', 1], 
    ['p123', 'c24', 'ORANGE JUICE', 325, 20.0, '2403', '#ffffff', 1], 
    ['p124', 'c24', 'APPLE JUICE', 325, 20.0, '2404', '#ffffff', 1], 

    // c25: Kids Daytime
    ['p125', 'c25', 'BEANS ON TOAST (VEG)', 600, 20.0, '2501', '#ffffff', 1], 
    ['p126', 'c25', 'CHEESE SANDWICH (VEG)', 600, 20.0, '2502', '#ffffff', 1], 
    ['p127', 'c25', 'TOMATO AND CUCUMBER SANDWICH (VEG)', 600, 20.0, '2503', '#ffffff', 1], 
    ['p128', 'c25', 'BACON SANDWICH', 600, 20.0, '2504', '#ffffff', 1], 
    ['p129', 'c25', 'SAUSAGE SANDWICH', 600, 20.0, '2505', '#ffffff', 1], 
    ['p130', 'c25', 'SCRAMBLED EGG ON TOAST', 750, 20.0, '2506', '#ffffff', 1], 
    ['p131', 'c25', '2 POACHED EGG ON TOAST', 750, 20.0, '2507', '#ffffff', 1], 

    // c26: Kids Evening
    ['p132', 'c26', '3 LOCAL GRILLED SAUSAGES', 1000, 20.0, '2601', '#ffffff', 1], 
    ['p133', 'c26', 'LINGUINI RATATOUILLE', 1100, 20.0, '2602', '#ffffff', 1], 
    ['p134', 'c26', 'TOMATO AND MEATBALL LINGUINI', 1250, 20.0, '2603', '#ffffff', 1], 
    ['p135', 'c26', 'TERIAKI BEEF TACOS', 1250, 20.0, '2604', '#ffffff', 1] 
  ];
  const stmt = db.prepare('INSERT INTO products (id, category_id, name, Price_Cents, vat_percent, barcode, color, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for (const row of products) stmt.run(...row);
}

console.log('--- Seed Complete ---');
console.log('Manager PIN: 1234');
console.log('Staff PIN: 1111');