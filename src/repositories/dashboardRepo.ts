import { getDb } from '@/database/db';

export type DashboardStats = {
  shoppingOpen: number;
  tasksOpen: number;
  pantryCount: number;
  billsOpen: number;
  monthSpend: number;
};

const monthKeyLocal = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export async function getDashboardStats(householdId: string): Promise<DashboardStats> {
  const db = await getDb();
  const row = await db.getFirstAsync<DashboardStats>(
    `SELECT
      (SELECT COUNT(*) FROM shopping_items si JOIN shopping_lists sl ON sl.id = si.list_id WHERE sl.household_id = ? AND si.checked = 0) AS shoppingOpen,
      (SELECT COUNT(*) FROM tasks WHERE household_id = ? AND completed = 0) AS tasksOpen,
      (SELECT COUNT(*) FROM pantry_items WHERE household_id = ?) AS pantryCount,
      (SELECT COUNT(*) FROM bills WHERE household_id = ? AND status != 'paid') AS billsOpen,
      COALESCE((SELECT SUM(amount) FROM transactions WHERE household_id = ? AND type = 'expense' AND substr(date, 1, 7) = ?), 0) AS monthSpend`,
    householdId,
    householdId,
    householdId,
    householdId,
    householdId,
    monthKeyLocal(),
  );

  return row ?? { shoppingOpen: 0, tasksOpen: 0, pantryCount: 0, billsOpen: 0, monthSpend: 0 };
}
