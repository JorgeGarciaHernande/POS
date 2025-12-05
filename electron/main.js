
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

let mainWindow;
let db;

function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'restaurant-pos.db');
  db = new Database(dbPath);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      image TEXT,
      available BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS modifiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      options TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      items TEXT NOT NULL,
      subtotal REAL NOT NULL,
      tax REAL NOT NULL,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      modifiers TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);

  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', 'admin123', 'admin');
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('cajero', 'cajero123', 'cashier');
  }

  const productsCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (productsCount.count === 0) {
    const products = [
      { name: 'Hamburguesa Clásica', category: 'Comida', price: 85.00 },
      { name: 'Pizza Pepperoni', category: 'Comida', price: 120.00 },
      { name: 'Tacos al Pastor (3 pzas)', category: 'Comida', price: 45.00 },
      { name: 'Ensalada César', category: 'Comida', price: 65.00 },
      { name: 'Hot Dog', category: 'Comida', price: 40.00 },
      { name: 'Alitas BBQ (10 pzas)', category: 'Comida', price: 95.00 },
      { name: 'Coca-Cola', category: 'Bebida', price: 25.00 },
      { name: 'Agua Mineral', category: 'Bebida', price: 20.00 },
      { name: 'Limonada Natural', category: 'Bebida', price: 30.00 },
      { name: 'Cerveza', category: 'Bebida', price: 45.00 },
      { name: 'Café Americano', category: 'Bebida', price: 35.00 },
      { name: 'Pastel de Chocolate', category: 'Postre', price: 55.00 },
      { name: 'Helado', category: 'Postre', price: 40.00 },
      { name: 'Cheesecake', category: 'Postre', price: 60.00 },
    ];

    const insertProduct = db.prepare('INSERT INTO products (name, category, price) VALUES (?, ?, ?)');
    products.forEach(p => insertProduct.run(p.name, p.category, p.price));
  }

  const modifiersCount = db.prepare('SELECT COUNT(*) as count FROM modifiers').get();
  if (modifiersCount.count === 0) {
    const modifiers = [
      { name: 'Tamaño', type: 'radio', options: JSON.stringify(['Chico', 'Mediano', 'Grande']) },
      { name: 'Extras', type: 'checkbox', options: JSON.stringify(['Queso Extra +$15', 'Aguacate +$20', 'Tocino +$25', 'Jalapeños +$10']) },
      { name: 'Término', type: 'radio', options: JSON.stringify(['Poco Cocido', 'Término Medio', 'Bien Cocido']) },
      { name: 'Sin', type: 'checkbox', options: JSON.stringify(['Sin Cebolla', 'Sin Tomate', 'Sin Lechuga', 'Sin Mayonesa']) },
    ];

    const insertModifier = db.prepare('INSERT INTO modifiers (name, type, options) VALUES (?, ?, ?)');
    modifiers.forEach(m => insertModifier.run(m.name, m.type, m.options));
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    frame: true,
    titleBarStyle: 'default',
  });

  if (process.env.NODE_ENV !== 'production') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) db.close();
    app.quit();
  }
});

ipcMain.handle('auth:login', (event, { username, password }) => {
  try {
    const user = db.prepare('SELECT id, username, role FROM users WHERE username = ? AND password = ?').get(username, password);
    return { success: !!user, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:getAll', () => {
  try {
    const products = db.prepare('SELECT * FROM products WHERE available = 1 ORDER BY category, name').all();
    return { success: true, data: products };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('modifiers:getAll', () => {
  try {
    const modifiers = db.prepare('SELECT * FROM modifiers').all();
    const parsed = modifiers.map(m => ({
      ...m,
      options: JSON.parse(m.options)
    }));
    return { success: true, data: parsed };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('orders:create', (event, orderData) => {
  try {
    const orderNumber = `ORD-${Date.now()}`;
    const insertOrder = db.prepare(`
      INSERT INTO orders (order_number, items, subtotal, tax, total, payment_method, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = insertOrder.run(
      orderNumber,
      JSON.stringify(orderData.items),
      orderData.subtotal,
      orderData.tax,
      orderData.total,
      orderData.paymentMethod,
      orderData.userId
    );

    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, quantity, price, modifiers)
      VALUES (?, ?, ?, ?, ?)
    `);

    orderData.items.forEach(item => {
      insertItem.run(
        result.lastInsertRowid,
        item.id,
        item.quantity,
        item.price,
        JSON.stringify(item.modifiers || [])
      );
    });

    return { success: true, orderId: result.lastInsertRowid, orderNumber };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:getSales', (event, { startDate, endDate }) => {
  try {
    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (startDate) {
      query += ' AND DATE(created_at) >= DATE(?)';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND DATE(created_at) <= DATE(?)';
      params.push(endDate);
    }

    query += ' ORDER BY created_at DESC';

    const orders = db.prepare(query).all(...params);
    const parsed = orders.map(o => ({
      ...o,
      items: JSON.parse(o.items)
    }));

    return { success: true, data: parsed };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:getTopProducts', (event, { limit = 3, startDate, endDate }) => {
  try {
    let query = `
      SELECT 
        p.id,
        p.name,
        p.category,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.quantity * oi.price) as total_revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      query += ' AND DATE(o.created_at) >= DATE(?)';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND DATE(o.created_at) <= DATE(?)';
      params.push(endDate);
    }

    query += `
      GROUP BY p.id
      ORDER BY total_quantity DESC
      LIMIT ?
    `;
    params.push(limit);

    const topProducts = db.prepare(query).all(...params);
    return { success: true, data: topProducts };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:getLeastProducts', (event, { limit = 3, startDate, endDate }) => {
  try {
    let query = `
      SELECT 
        p.id,
        p.name,
        p.category,
        COALESCE(SUM(oi.quantity), 0) as total_quantity,
        COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE p.available = 1
    `;
    const params = [];

    if (startDate || endDate) {
      query += ' AND (oi.id IS NULL';
      if (startDate) {
        query += ' OR DATE(o.created_at) >= DATE(?)';
        params.push(startDate);
      }
      if (endDate) {
        query += ' OR DATE(o.created_at) <= DATE(?)';
        params.push(endDate);
      }
      query += ')';
    }

    query += `
      GROUP BY p.id
      ORDER BY total_quantity ASC
      LIMIT ?
    `;
    params.push(limit);

    const leastProducts = db.prepare(query).all(...params);
    return { success: true, data: leastProducts };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:getDailySales', (event, { startDate, endDate }) => {
  try {
    let query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as order_count,
        SUM(total) as total_sales
      FROM orders
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      query += ' AND DATE(created_at) >= DATE(?)';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND DATE(created_at) <= DATE(?)';
      params.push(endDate);
    }

    query += ' GROUP BY DATE(created_at) ORDER BY date ASC';

    const dailySales = db.prepare(query).all(...params);
    return { success: true, data: dailySales };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('print:ticket', (event, ticketData) => {
  try {
    console.log('Imprimiendo ticket:', ticketData);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
