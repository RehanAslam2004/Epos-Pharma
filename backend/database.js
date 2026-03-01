const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let db = null;
let SQL = null;

function getDbPath() {
  try {
    const { app } = require('electron');
    return path.join(app.getPath('userData'), 'database.sqlite');
  } catch {
    return path.join(__dirname, '..', 'database', 'database.sqlite');
  }
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dbPath, buffer);
}

// Auto-save every 30 seconds
let saveInterval = null;
function startAutoSave() {
  if (saveInterval) return;
  saveInterval = setInterval(() => { try { saveDb(); } catch { } }, 30000);
}

async function initSQL() {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  return SQL;
}

async function getDatabase() {
  if (db) return db;

  const SqlJs = await initSQL();
  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SqlJs.Database(fileBuffer);
  } else {
    db = new SqlJs.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  // Perform integrity check
  try {
    const check = db.exec('PRAGMA integrity_check')[0];
    if (check && check.values && check.values[0] && check.values[0][0] !== 'ok') {
      console.error('DATABASE CORRUPTION DETECTED:', check.values[0][0]);
      // In a more robust system, we would trigger an automatic restore here.
    } else {
      console.log('Database integrity check passed.');
    }
  } catch (err) {
    console.error('Failed to run integrity check:', err);
  }

  initializeDatabase();
  saveDb();
  startAutoSave();
  return db;
}

// Wrapper helpers that mimic better-sqlite3 API for easier route usage
function dbRun(sql, params = [], skipSave = false) {
  db.run(sql, params);
  const changes = db.getRowsModified(); // MUST capture before any other SQL
  const lastId = db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] || 0;
  if (!skipSave) saveDb();
  return { lastInsertRowid: lastId, changes };
}

function dbGet(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let row = null;
  if (stmt.step()) {
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    row = {};
    cols.forEach((c, i) => { row[c] = vals[i]; });
  }
  stmt.free();
  return row;
}

function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    const row = {};
    cols.forEach((c, i) => { row[c] = vals[i]; });
    rows.push(row);
  }
  stmt.free();
  return rows;
}

function dbExec(sql) {
  db.run(sql);
}

function initializeDatabase() {
  // Users table
  dbExec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT DEFAULT '',
      role TEXT DEFAULT 'staff',
      session_token TEXT,
      last_login TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Products table
  dbExec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      brand TEXT DEFAULT '',
      batch TEXT DEFAULT '',
      expiry TEXT,
      purchase_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      barcode TEXT UNIQUE,
      supplier_id INTEGER,
      category TEXT DEFAULT 'General',
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
    )
  `);

  // Customers table
  dbExec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      type TEXT DEFAULT 'walk-in',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Suppliers table
  dbExec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      company TEXT DEFAULT '',
      ntn TEXT DEFAULT '',
      balance REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Purchases table
  dbExec(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      supplier_id INTEGER NOT NULL,
      total_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'unpaid',
      payment_method TEXT DEFAULT 'credit',
      date TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT
    )
  `);

  // Purchase Items table (Updated for FIFO)
  dbExec(`
    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      remaining_quantity INTEGER DEFAULT 1,
      purchase_price REAL DEFAULT 0,
      batch TEXT DEFAULT '',
      expiry TEXT,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    )
  `);

  // Supplier Payments table
  dbExec(`
    CREATE TABLE IF NOT EXISTS supplier_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      method TEXT DEFAULT 'cash',
      reference TEXT DEFAULT '',
      date TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
    )
  `);

  // Sales table
  dbExec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      total REAL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      payment_details TEXT DEFAULT '',
      status TEXT DEFAULT 'completed',
      notes TEXT DEFAULT '',
      date TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    )
  `);

  // Sale items table
  dbExec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      price REAL DEFAULT 0,
      subtotal REAL DEFAULT 0,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
  `);

  // Sale item batches (linking table for exact FIFO COGS deductions)
  dbExec(`
    CREATE TABLE IF NOT EXISTS sale_item_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_item_id INTEGER NOT NULL,
      purchase_item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      FOREIGN KEY (sale_item_id) REFERENCES sale_items(id) ON DELETE CASCADE,
      FOREIGN KEY (purchase_item_id) REFERENCES purchase_items(id) ON DELETE RESTRICT
    )
  `);

  // Expenses table
  dbExec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT DEFAULT (datetime('now')),
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      reference TEXT DEFAULT '',
      notes TEXT DEFAULT ''
    )
  `);

  // Trial & License table
  dbExec(`
    CREATE TABLE IF NOT EXISTS trial_license (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trial_start TEXT,
      trial_end TEXT,
      license_key TEXT,
      activation_date TEXT,
      machine_id TEXT,
      is_licensed INTEGER DEFAULT 0
    )
  `);

  // Settings table
  dbExec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pharmacy_name TEXT DEFAULT 'EPOS Pharma',
      logo_path TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      email TEXT DEFAULT '',
      payment_methods TEXT DEFAULT '["cash","jazzcash","easypaisa","card"]',
      theme TEXT DEFAULT 'green',
      currency TEXT DEFAULT 'PKR',
      tax_rate REAL DEFAULT 0
    )
  `);

  // Backups table
  dbExec(`
    CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backup_file TEXT NOT NULL,
      size INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      date TEXT DEFAULT (datetime('now'))
    )
  `);

  // Auto-seeding of admin, settings, and trial removed for Setup Wizard.

  // Seed walk-in customer
  const walkInExists = dbGet("SELECT id FROM customers WHERE name = ?", ['Walk-in Customer']);
  if (!walkInExists) {
    dbRun('INSERT INTO customers (name, type) VALUES (?, ?)', ['Walk-in Customer', 'walk-in']);
  }

  // --- Backward Compatibility Schema Migrations ---
  // Ensure 'remaining_quantity' tracking exists on legacy purchase_items for FIFO execution
  try {
    const pInfo = dbAll("PRAGMA table_info(purchase_items)");
    if (!pInfo.some(c => c.name === 'remaining_quantity')) {
      dbExec(`ALTER TABLE purchase_items ADD COLUMN remaining_quantity INTEGER DEFAULT 0`);
      // For historical data, assume everything bought in the past has all of its quantity remaining 
      // relative to its batch (unless we re-compute the entire world which is dangerous on live Prod).
      dbExec(`UPDATE purchase_items SET remaining_quantity = quantity`);
    }
  } catch (e) {
    console.error("Migration error adding remaining_quantity:", e);
  }

  // --- Indexes for High Performance ---
  dbExec(`CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)`);
  dbExec(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`);
  dbExec(`CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date)`);
  dbExec(`CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id)`);
  dbExec(`CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)`);
}

function closeDatabase() {
  if (saveInterval) { clearInterval(saveInterval); saveInterval = null; }
  if (db) { saveDb(); db.close(); db = null; }
}

module.exports = { getDatabase, closeDatabase, getDbPath, dbRun, dbGet, dbAll, dbExec, saveDb };
