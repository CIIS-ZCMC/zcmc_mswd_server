export const INFORMANT_RELATIONSHIP_OPTIONS = [
  { value: "Patient", label: "Patient / Self" },
  { value: "Spouse", label: "Spouse" },
  { value: "Mother", label: "Mother" },
  { value: "Father", label: "Father" },
  { value: "Son", label: "Son" },
  { value: "Daughter", label: "Daughter" },
  { value: "Brother", label: "Brother" },
  { value: "Sister", label: "Sister" },
  { value: "Grandparent", label: "Grandparent" },
  { value: "Guardian", label: "Guardian / Representative" },
  { value: "Relative", label: "Relative" },
  { value: "Friend", label: "Friend / Neighbor" },
  { value: "Other", label: "Other" },
] as const

export {
  HOUSE_TENURE_OPTIONS,
  LIGHT_SOURCE_OPTIONS,
  WATER_SOURCE_OPTIONS,
} from "@/lib/socioeconomic-constants"

export const EXPENSE_CATEGORY_OPTIONS = [
  { value: "Food", label: "Food" },
  { value: "Transport", label: "Transport" },
  { value: "Medical", label: "Medical" },
  { value: "Insurance Premium", label: "Insurance Premium" },
  { value: "Education", label: "Education" },
  { value: "Clothing", label: "Clothing" },
  { value: "House help", label: "House help" },
  { value: "Others", label: "Others" },
] as const

export const PROBLEM_CATEGORY_OPTIONS = [
  { value: "health", label: "Health / Medical Needs" },
  { value: "economic", label: "Economic / Financial Support" },
  { value: "housing", label: "Housing / Shelter Issues" },
  { value: "food_nutrition", label: "Food & Nutrition" },
  { value: "employment", label: "Employment / Livelihood" },
  { value: "other", label: "Other Needs" },
] as const

export const TYPE_OF_ASSISTANCE_OPTIONS = [
  { value: "Medicines", label: "Medicines" },
  { value: "Laboratory", label: "Laboratory" },
  { value: "X-ray/Ultrasound/2D Echo/CT Scan/MRI", label: "X-ray/Ultrasound/2D Echo/CT Scan/MRI" },
  { value: "Hospital Bills", label: "Hospital Bills" },
  { value: "Supplies", label: "Supplies" },
  { value: "Hemodialysis", label: "Hemodialysis" },
  { value: "Rehab", label: "Rehab" },
  { value: "ECG", label: "ECG" },
  { value: "Others", label: "Others" },
] as const

export const MSWD_CLASSIFICATION_OPTIONS = [
  { value: "A", label: "Class A (Full Pay)" },
  { value: "B", label: "Class B (Partial Pay)" },
  { value: "C1", label: "Class C1 (Partial Subsidy)" },
  { value: "C2", label: "Class C2 (Substantial Subsidy)" },
  { value: "C3", label: "Class C3 (High Subsidy)" },
  { value: "D", label: "Class D (Indigent / Full Subsidy)" },
] as const

export const LEGACY_CLASSIFICATION_OPTIONS = [
  { value: "indigent", label: "Indigent (legacy)" },
  { value: "low_income", label: "Low Income (legacy)" },
  { value: "self_sufficient", label: "Self-Sufficient (legacy)" },
  { value: "others", label: "Others (legacy)" },
] as const

/**
 * The label for a stored option value. A value outside the list (legacy
 * free text, or something typed in the admin panel) is shown as stored.
 */
export function labelFor(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string | null | undefined
): string | null {
  if (!value) return null
  return options.find((o) => o.value === value)?.label ?? value
}

/**
 * Library options for a new-record Select: the active ones, plus the value the record
 * already stores so a retired option stays visible (shown as "(inactive)"). A value that
 * is not in the Library at all, such as a deleted row, is kept as typed.
 */
export function selectableOptions(
  options: ReadonlyArray<{ value: string; label: string; isActive?: boolean }>,
  current: string | null | undefined
): Array<{ value: string; label: string }> {
  const list = options
    .filter((o) => o.isActive !== false)
    .map(({ value, label }) => ({ value, label }))
  if (!current || list.some((o) => o.value === current)) return list

  const retired = options.find((o) => o.value === current)
  return [
    { value: current, label: `${retired?.label ?? current} (inactive)` },
    ...list,
  ]
}
