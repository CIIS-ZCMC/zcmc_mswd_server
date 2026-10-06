/**
 * The eight fixed expense items in ANNEX B form order with canonical labels.
 */
export const EXPENSE_ITEM_KEYS = [
  "food",
  "transport",
  "medical",
  "insurance",
  "education",
  "clothing",
  "houseHelp",
  "others",
] as const

export type ExpenseItemKey = (typeof EXPENSE_ITEM_KEYS)[number]

export const EXPENSE_ITEM_LABELS: Record<ExpenseItemKey, string> = {
  food: "Food",
  transport: "Transpo",
  medical: "Medikal",
  insurance: "Insurance",
  education: "Education",
  clothing: "Clothing",
  houseHelp: "House Help",
  others: "Others",
}

export function getExpenseItemLabel(key: string): string {
  if (key in EXPENSE_ITEM_LABELS) {
    return EXPENSE_ITEM_LABELS[key as ExpenseItemKey]
  }
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}
