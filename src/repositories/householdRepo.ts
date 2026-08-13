import { getDb, setSetting } from '@/database/db';
import { enqueueSync } from '@/database/queue';
import { newId, newUuid, nowIso } from '@/utils/id';
import type { Household } from '@/types/models';

export async function createHousehold(name: string): Promise<Household> {
  const db = await getDb();
  const now = nowIso();
  const household: Household = { id: newUuid(), name: name.trim(), currency: 'EUR', created_at: now, updated_at: now };
  const listId = newId('list');
  await db.withTransactionAsync(async () => {
    await db.runAsync('INSERT INTO households(id,name,currency,created_at,updated_at) VALUES(?,?,?,?,?)', household.id, household.name, household.currency, now, now);
    await db.runAsync('INSERT INTO household_members(id,household_id,user_id,display_name,role,joined_at) VALUES(?,?,?,?,?,?)', newId('member'), household.id, null, 'Ich', 'owner', now);
    await db.runAsync('INSERT INTO shopping_lists(id,household_id,name,created_at,updated_at) VALUES(?,?,?,?,?)', listId, household.id, 'Einkauf', now, now);
  });
  await enqueueSync('households', household.id, 'CREATE', household);
  await enqueueSync('shopping_lists', listId, 'CREATE', { id: listId, household_id: household.id, name: 'Einkauf', created_at: now, updated_at: now });
  await setSetting('active_household_id', household.id);
  return household;
}

export async function getHousehold(id: string): Promise<Household | null> {
  const db = await getDb();
  return (await db.getFirstAsync<Household>('SELECT * FROM households WHERE id = ?', id)) ?? null;
}
