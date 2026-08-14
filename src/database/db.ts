import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  dbPromise ??= SQLite.openDatabaseAsync('homeos.db');
  return dbPromise;
}

const pragmas = `PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`;
const migrations = [
  `CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS households (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'EUR', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS household_members (id TEXT PRIMARY KEY NOT NULL, household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE, user_id TEXT, display_name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', joined_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS shopping_lists (id TEXT PRIMARY KEY NOT NULL, household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE, name TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS shopping_items (id TEXT PRIMARY KEY NOT NULL, list_id TEXT NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE, name TEXT NOT NULL, quantity REAL NOT NULL DEFAULT 1, unit TEXT, category TEXT, store TEXT, estimated_price REAL, note TEXT, barcode TEXT, checked INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS pantry_items (id TEXT PRIMARY KEY NOT NULL, household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE, name TEXT NOT NULL, quantity REAL NOT NULL DEFAULT 1, unit TEXT, minimum_quantity REAL NOT NULL DEFAULT 0, category TEXT, storage_location TEXT, barcode TEXT, expiry_date TEXT, purchase_price REAL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY NOT NULL, household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE, title TEXT NOT NULL, description TEXT, room TEXT, assigned_to TEXT, priority TEXT, due_date TEXT, recurrence TEXT, completed INTEGER NOT NULL DEFAULT 0, completed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS calendar_events (id TEXT PRIMARY KEY NOT NULL, household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE, title TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT, category TEXT, note TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY NOT NULL, household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE, type TEXT NOT NULL CHECK(type IN ('expense','income')), amount REAL NOT NULL CHECK(amount >= 0), category TEXT NOT NULL, title TEXT NOT NULL, date TEXT NOT NULL, paid_by TEXT, note TEXT, receipt_url TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS budgets (id TEXT PRIMARY KEY NOT NULL, household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE, month TEXT NOT NULL, category TEXT, amount REAL NOT NULL CHECK(amount >= 0), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(household_id, month, category));`,
  `CREATE TABLE IF NOT EXISTS bills (id TEXT PRIMARY KEY NOT NULL, household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE, title TEXT NOT NULL, provider TEXT, amount REAL NOT NULL DEFAULT 0, due_date TEXT NOT NULL, recurring INTEGER NOT NULL DEFAULT 0, recurrence TEXT, status TEXT NOT NULL DEFAULT 'open', category TEXT, document_url TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY NOT NULL, household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE, name TEXT NOT NULL, manufacturer TEXT, model TEXT, serial_number TEXT, purchase_date TEXT, purchase_price REAL, warranty_until TEXT, location TEXT, photo_url TEXT, invoice_url TEXT, manual_url TEXT, notes TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS sync_queue (id TEXT PRIMARY KEY NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, operation TEXT NOT NULL CHECK(operation IN ('CREATE','UPDATE','DELETE')), payload TEXT, created_at TEXT NOT NULL, retry_count INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending', last_error TEXT);`,
  `CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`,
  `CREATE INDEX IF NOT EXISTS idx_shopping_lists_household ON shopping_lists(household_id);`,
  `CREATE INDEX IF NOT EXISTS idx_shopping_items_list_checked ON shopping_items(list_id, checked, created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_pantry_household ON pantry_items(household_id);`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_household ON tasks(household_id, completed, due_date);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_household_date ON transactions(household_id, date);`,
  `CREATE INDEX IF NOT EXISTS idx_bills_household_status_due ON bills(household_id, status, due_date);`,
  `CREATE INDEX IF NOT EXISTS idx_devices_household ON devices(household_id, name);`,
  `CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, created_at);`,
];

export async function migrateDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(pragmas);
  await db.withTransactionAsync(async () => {
    for (const sql of migrations) await db.execAsync(sql);
    await db.runAsync(`INSERT OR REPLACE INTO schema_meta(key,value) VALUES('version','2')`);
  });
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO app_settings(key,value) VALUES(?,?)', key, value);
}
