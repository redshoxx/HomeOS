export function budgetRemaining(budget: number, spent: number): number { return Math.max(0, budget - spent); }
export function isBelowMinimum(quantity: number, minimum: number): boolean { return quantity < minimum; }
export function daysUntil(dateIso: string, now = new Date()): number {
  const target = new Date(dateIso);
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const b = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.ceil((b - a) / 86400000);
}
export function nextRecurringDate(baseIso: string, recurrence: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'): string {
  const d = new Date(baseIso);
  if (recurrence === 'daily') d.setDate(d.getDate() + 1);
  if (recurrence === 'weekly') d.setDate(d.getDate() + 7);
  if (recurrence === 'biweekly') d.setDate(d.getDate() + 14);
  if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1);
  if (recurrence === 'yearly') d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}
