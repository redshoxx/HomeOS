export function formatMoney(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('de-AT', { style: 'currency', currency }).format(amount);
}
