import { getDb } from './db';
import { newId, nowIso } from '@/utils/id';

type Op = 'CREATE' | 'UPDATE' | 'DELETE';

export async function enqueueSync(entityType: string, entityId: string, operation: Op, payload?: unknown): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO sync_queue(id,entity_type,entity_id,operation,payload,created_at,status) VALUES(?,?,?,?,?,?, 'pending')`,
    newId('sync'), entityType, entityId, operation, payload === undefined ? null : JSON.stringify(payload), nowIso()
  );
}

export async function pendingSyncCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM sync_queue WHERE status IN ('pending','failed')`);
  return row?.count ?? 0;
}
