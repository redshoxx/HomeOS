import { getDefaultList, listItems } from './shoppingRepo';
import { listBills, listPantry, listTasks } from './homeRepo';
import { monthSpend } from './financeRepo';

export type DashboardStats = { shoppingOpen: number; tasksOpen: number; pantryCount: number; billsOpen: number; monthSpend: number };

export async function getDashboardStats(householdId: string): Promise<DashboardStats> {
  const list = await getDefaultList(householdId);
  const [shoppingItems, tasks, pantry, bills, spending] = await Promise.all([
    list ? listItems(list.id) : Promise.resolve([]),
    listTasks(householdId),
    listPantry(householdId),
    listBills(householdId),
    monthSpend(householdId, new Date().toISOString().slice(0, 7)),
  ]);
  return { shoppingOpen: shoppingItems.filter((item) => item.checked === 0).length, tasksOpen: tasks.filter((task) => task.completed === 0).length, pantryCount: pantry.length, billsOpen: bills.filter((bill) => bill.status !== 'paid').length, monthSpend: spending };
}
