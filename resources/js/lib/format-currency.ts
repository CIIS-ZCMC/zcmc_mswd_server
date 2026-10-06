/**
 * Format numeric value as Philippine Peso currency string (e.g. ₱12,000.00).
 */
export function formatCurrency(val: number | null | undefined): string {
  if (val === null || val === undefined) return "₱0.00"
  return `₱${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
