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

export const RECOMMENDATION_MODE_OPTIONS = [
  { value: "financial_assistance", label: "Financial Assistance" },
  { value: "medical_assistance", label: "Medical / Diagnostic Assistance" },
  { value: "counseling", label: "Counseling / Psychosocial Support" },
  { value: "referral", label: "Referral to External Agency" },
  { value: "hospital_discount", label: "Hospital Discount (MSWD Matrix)" },
  { value: "other", label: "Other" },
] as const

export const FUND_SOURCE_OPTIONS = [
  { value: "mswd", label: "MSWD Fund" },
  { value: "maip", label: "MAIP (DOH)" },
  { value: "malasakit", label: "Malasakit Center" },
  { value: "pcso", label: "PCSO / Pagcor" },
  { value: "lgu_dswd", label: "LGU / DSWD Assistance" },
  { value: "ngo", label: "NGO / Private Donors" },
  { value: "philhealth", label: "PhilHealth Benefit" },
  { value: "personal", label: "Personal / Out of Pocket" },
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
