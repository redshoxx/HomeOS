import { getDb } from '@/database/db';
import { enqueueSync } from '@/database/queue';
import { newId, nowIso } from '@/utils/id';
import type { ShoppingItem, ShoppingList } from '@/types/models';

export async function getDefaultList(householdId: string): Promise<ShoppingList | null> {
  const db = await getDb();
  return (await db.getFirstAsync<ShoppingList>('SELECT * FROM shopping_lists WHERE household_id = ? ORDER BY created_at LIMIT 1', householdId)) ?? null;
}
export async function listItems(listId: string): Promise<ShoppingItem[]> {
  const db = await getDb();
  return db.getAllAsync<ShoppingItem>('SELECT * FROM shopping_items WHERE list_id = ? ORDER BY checked, category, created_at DESC', listId);
}
export async function addShoppingItem(listId: string, name: string): Promise<void> {
  const db = await getDb(); const id = newId('shop'); const now = nowIso();
  const payload = { id, list_id: listId, name: name.trim(), quantity: 1, checked: false, created_at: now, updated_at: now };
  await db.runAsync('INSERT INTO shopping_items(id,list_id,name,quantity,checked,created_at,updated_at) VALUES(?,?,?,?,?,?,?)', id, listId, payload.name, 1, 0, now, now);
  await enqueueSync('shopping_items', id, 'CREATE', payload);
}
export async function toggleShoppingItem(id: string, checked: boolean): Promise<void> {
  const db = await getDb(); const now = nowIso();
  await db.runAsync('UPDATE shopping_items SET checked=?, updated_at=? WHERE id=?', checked ? 1 : 0, now, id);
  await enqueueSync('shopping_items', id, 'UPDATE', { checked, updated_at: now });
}
export async function deleteShoppingItem(id: string): Promise<void> {
  const db = await getDb(); await db.runAsync('DELETE FROM shopping_items WHERE id=?', id); await enqueueSync('shopping_items', id, 'DELETE');
}
