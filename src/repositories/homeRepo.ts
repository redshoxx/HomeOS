import { getDb } from '@/database/db';
import { enqueueSync } from '@/database/queue';
import { newId, nowIso } from '@/utils/id';
import type { PantryItem, Task, Bill, Device } from '@/types/models';

export async function listPantry(householdId: string): Promise<PantryItem[]> {
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM pantry_items WHERE household_id=? ORDER BY name', householdId);
}

export async function addPantry(householdId: string, name: string): Promise<void> {
  const db = await getDb();
  const id = newId('pantry');
  const now = nowIso();
  const payload = { id, household_id: householdId, name: name.trim(), quantity: 1, minimum_quantity: 0, created_at: now, updated_at: now };
  await db.runAsync(
    'INSERT INTO pantry_items(id,household_id,name,quantity,minimum_quantity,created_at,updated_at) VALUES(?,?,?,?,?,?,?)',
    id,
    householdId,
    payload.name,
    1,
    0,
    now,
    now,
  );
  await enqueueSync('pantry_items', id, 'CREATE', payload);
}

export async function deletePantry(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM pantry_items WHERE id=?', id);
  await enqueueSync('pantry_items', id, 'DELETE');
}

export async function listTasks(householdId: string): Promise<Task[]> {
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM tasks WHERE household_id=? ORDER BY completed, due_date IS NULL, due_date, created_at DESC', householdId);
}

export async function listDueTasks(householdId: string, dueOnOrBefore: string, limit = 6): Promise<Task[]> {
  const db = await getDb();
  return db.getAllAsync(
    'SELECT * FROM tasks WHERE household_id=? AND completed=0 AND due_date IS NOT NULL AND due_date<=? ORDER BY due_date, created_at DESC LIMIT ?',
    householdId,
    dueOnOrBefore,
    limit,
  );
}

export async function addTask(householdId: string, title: string, dueDate?: string | null): Promise<void> {
  const db = await getDb();
  const id = newId('task');
  const now = nowIso();
  const payload = { id, household_id: householdId, title: title.trim(), due_date: dueDate ?? null, completed: false, created_at: now, updated_at: now };
  await db.runAsync(
    'INSERT INTO tasks(id,household_id,title,due_date,completed,created_at,updated_at) VALUES(?,?,?,?,?,?,?)',
    id,
    householdId,
    payload.title,
    payload.due_date,
    0,
    now,
    now,
  );
  await enqueueSync('tasks', id, 'CREATE', payload);
}

export async function toggleTask(id: string, completed: boolean): Promise<void> {
  const db = await getDb();
  const now = nowIso();
  await db.runAsync('UPDATE tasks SET completed=?, completed_at=?, updated_at=? WHERE id=?', completed ? 1 : 0, completed ? now : null, now, id);
  await enqueueSync('tasks', id, 'UPDATE', { completed, completed_at: completed ? now : null, updated_at: now });
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM tasks WHERE id=?', id);
  await enqueueSync('tasks', id, 'DELETE');
}

export async function listBills(householdId: string): Promise<Bill[]> {
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM bills WHERE household_id=? ORDER BY status, due_date', householdId);
}

export async function addBill(householdId: string, title: string, amount: number, dueDate: string): Promise<void> {
  const db = await getDb();
  const id = newId('bill');
  const now = nowIso();
  const payload = { id, household_id: householdId, title: title.trim(), amount, due_date: dueDate, status: 'open', created_at: now, updated_at: now };
  await db.runAsync(
    `INSERT INTO bills(id,household_id,title,amount,due_date,status,created_at,updated_at) VALUES(?,?,?,?,?,'open',?,?)`,
    id,
    householdId,
    payload.title,
    amount,
    dueDate,
    now,
    now,
  );
  await enqueueSync('bills', id, 'CREATE', payload);
}

export async function deleteBill(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM bills WHERE id=?', id);
  await enqueueSync('bills', id, 'DELETE');
}

export async function listDevices(householdId: string): Promise<Device[]> {
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM devices WHERE household_id=? ORDER BY name', householdId);
}

export async function addDevice(householdId: string, name: string): Promise<void> {
  const db = await getDb();
  const id = newId('device');
  const now = nowIso();
  const payload = { id, household_id: householdId, name: name.trim(), created_at: now, updated_at: now };
  await db.runAsync('INSERT INTO devices(id,household_id,name,created_at,updated_at) VALUES(?,?,?,?,?)', id, householdId, payload.name, now, now);
  await enqueueSync('devices', id, 'CREATE', payload);
}

export async function deleteDevice(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM devices WHERE id=?', id);
  await enqueueSync('devices', id, 'DELETE');
}
