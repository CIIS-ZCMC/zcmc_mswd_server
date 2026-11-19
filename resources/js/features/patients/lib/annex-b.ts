import type {
  Assessment,
  CreateAssessmentPayload,
  MswdClassificationMatrix,
  UpdateAssessmentPayload,
} from "@/features/cases/types/assessment.types"
import type { SocioeconomicCurrent } from "@/features/socioeconomic/types"

/**
 * Helpers for the intake dialog's ANNEX B wizard: the option codes the server
 * accepts, the household money maths (as `CalculateMswdClassificationAction`
 * does it), and the payload the intake API takes.
 */

/** What the server accepts (`Assessment::LIGHT_SOURCES`, `WATER_SOURCES`, `PROBLEM_CATEGORIES`). */
export const LIGHT_OPTIONS = [
  { code: "electricity", label: "Electricity" },
  { code: "kerosene", label: "Kerosene" },
  { code: "candle", label: "Candle" },
] as const

export const WATER_OPTIONS = [
  { code: "owned", label: "Piped (owned)" },
  { code: "public", label: "Public faucet" },
  { code: "artesian_well", label: "Artesian well" },
] as const

export const PROBLEM_OPTIONS = [
  { code: "health", label: "Health / Medical" },
  { code: "economic", label: "Economic & Financial" },
  { code: "housing", label: "Housing / Shelter" },
  { code: "food_nutrition", label: "Food & Nutrition" },
  { code: "employment", label: "Employment / Livelihood" },
  { code: "other", label: "Others" },
] as const

export type HouseTenure = "owned" | "rented"

export interface ExpenseLine {
  id: string
  name: string
  amount: number
  isLocked?: boolean
  isCustom?: boolean
  sourceNote?: string
}

/**
 * Names that the UIS section III slots recognise
 * (`App\Support\UisExpenseSlots::KEYWORDS`), so the amounts print where they belong.
 */
export const STANDARD_EXPENSES: ReadonlyArray<{ id: string; name: string }> = [
  { id: "food", name: "Food" },
  { id: "transport", name: "Transportation" },
  { id: "medical", name: "Medical" },
]

export const RENT_EXPENSE_ID = "rent"

function line(id: string, name: string, amount: number | null | undefined): ExpenseLine {
  return { id, name, amount: Number(amount) || 0 }
}

/**
 * The expense lines a new intake starts from: the patient's newest
 * Socio-economic record when there is one, else the standard lines at zero.
 * House rent is its own locked line, driven by the house tenure.
 */
export function defaultExpenseLines(
  current: SocioeconomicCurrent | null | undefined
): ExpenseLine[] {
  const rent: ExpenseLine = {
    id: RENT_EXPENSE_ID,
    name: "House rent",
    amount: 0,
    isLocked: true,
    sourceNote: "from House / lot",
  }

  if (!current) {
    return [rent, ...STANDARD_EXPENSES.map((e) => line(e.id, e.name, 0))]
  }

  const e = current.expenses
  const lines = [
    line("food", "Food", e.food),
    line("transport", "Transportation", e.transport),
    line("medical", "Medical", e.medical),
    line("insurance", "Insurance", e.insurance),
    line("education", "Education", e.education),
    line("clothing", "Clothing", e.clothing),
    line("house_help", "House help", e.houseHelp),
    line(
      "others",
      e.othersSpecify ? `Others: ${e.othersSpecify}` : "Others",
      e.others
    ),
  ]
  const utilities = (Number(current.lightAmount) || 0) + (Number(current.waterAmount) || 0)
  if (utilities > 0) lines.push(line("utilities", "Light & water", utilities))

  // Keep the three standard lines visible even at zero.
  return [
    rent,
    ...lines.filter(
      (l) => l.amount > 0 || STANDARD_EXPENSES.some((s) => s.id === l.id)
    ),
  ]
}

/** The lines of an intake already taken (its own, not the patient's record). */
export function expenseLinesOf(assessment: Assessment): ExpenseLine[] {
  const lines = assessment.expenses.map((x) => ({
    id: `saved-${x.id}`,
    name: x.expenseType,
    amount: Number(x.amount) || 0,
  }))
  const hasRent = lines.some((l) => /rent/i.test(l.name))

  return hasRent
    ? lines.map((l) =>
        /rent/i.test(l.name)
          ? { ...l, id: RENT_EXPENSE_ID, name: "House rent", isLocked: true, sourceNote: "from House / lot" }
          : l
      )
    : [{ id: RENT_EXPENSE_ID, name: "House rent", amount: 0, isLocked: true, sourceNote: "from House / lot" }, ...lines]
}

/**
 * Net per capita income: (family income - expenses) / household size, never
 * below zero. The same rule the server applies.
 */
export function netPerCapitaIncome(
  familyIncome: number,
  expensesTotal: number,
  householdSize: number
): number {
  return Math.max(0, (familyIncome - expensesTotal) / Math.max(1, householdSize))
}

/** The matrix bracket a net per capita income falls in, or null when the matrix is empty. */
export function bracketFor(
  matrix: MswdClassificationMatrix[] | undefined,
  netPerCapita: number
): MswdClassificationMatrix | null {
  if (!matrix || matrix.length === 0) return null

  return (
    matrix.find((tier) => {
      const min = tier.minPerCapitaIncome ?? 0
      const max = tier.maxPerCapitaIncome
      return netPerCapita >= min && (max === null || netPerCapita <= max)
    }) ?? null
  )
}

export interface AnnexBState {
  informant: {
    lastName: string
    firstName: string
    middleName: string
    relationship: string
    contactNumber: string
    /** Picked from PSGC; sent only when complete or when it replaces a PSGC address. */
    address: { line: string; cityCode: string | null; barangayCode: string | null }
    sendAddress: boolean
  }
  totalFamilyIncome: number
  houseTenure: HouseTenure
  lightSources: string[]
  waterSources: string[]
  expenses: ExpenseLine[]
  presentingProblem: string
  problemCategories: string[]
  /** Library assistance type name; "Others" pairs with `otherAssistance`. */
  assistanceType: string
  otherAssistance: string
  medicalHistory: string
  assessmentNotes: string
  recommendation: string
  recommendationMode: string | null
  classificationOverride: { code: string; reason: string } | null
}

function trimmed(value: string): string | null {
  return value.trim() || null
}

/** The part of the payload an existing intake can take (expense lines are saved apart). */
export function buildAnnexBUpdatePayload(state: AnnexBState): UpdateAssessmentPayload {
  const { informant } = state
  const name = [informant.firstName, informant.middleName, informant.lastName]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(" ")
  const contact = trimmed(informant.contactNumber)

  const specify =
    state.assistanceType === "Others"
      ? state.otherAssistance.trim()
        ? `Others: ${state.otherAssistance.trim()}`
        : "Others"
      : trimmed(state.assistanceType)

  return {
    informant_name: name || null,
    informant_last_name: trimmed(informant.lastName),
    informant_first_name: trimmed(informant.firstName),
    informant_middle_name: trimmed(informant.middleName),
    informant_relationship: trimmed(informant.relationship),
    ...(informant.sendAddress
      ? {
          informant_address_line: trimmed(informant.address.line),
          informant_address_city_code: informant.address.cityCode,
          informant_address_barangay_code: informant.address.barangayCode,
        }
      : {}),
    informant_contact_number: contact,
    informant_contact: contact,
    total_family_income: state.totalFamilyIncome,
    house_tenure: state.houseTenure,
    light_source: state.lightSources.length > 0 ? state.lightSources : null,
    water_source: state.waterSources.length > 0 ? state.waterSources : null,
    presenting_problem: trimmed(state.presentingProblem),
    problem_categories: state.problemCategories.length > 0 ? state.problemCategories : null,
    problem_specify: specify,
    medical_history: trimmed(state.medicalHistory),
    recommendation: trimmed(state.recommendation),
    recommendation_mode: state.recommendationMode,
    assessment_notes: trimmed(state.assessmentNotes),
    // The server computes the class; only an override travels, with its reason.
    ...(state.classificationOverride
      ? {
          classification: state.classificationOverride.code,
          classification_override_reason: trimmed(state.classificationOverride.reason),
        }
      : {}),
  }
}

/** The payload that takes a new intake: the update part plus its expense lines. */
export function buildAnnexBCreatePayload(state: AnnexBState): CreateAssessmentPayload {
  return {
    ...buildAnnexBUpdatePayload(state),
    expenses: billableExpenses(state.expenses),
  }
}

/** Lines worth saving: named and above zero. */
export function billableExpenses(
  lines: ExpenseLine[]
): Array<{ expense_type: string; amount: number }> {
  return lines
    .filter((l) => l.name.trim() !== "" && l.amount > 0)
    .map((l) => ({ expense_type: l.name.trim(), amount: l.amount }))
}
