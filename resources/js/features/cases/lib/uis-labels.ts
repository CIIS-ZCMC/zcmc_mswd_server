import type { ApiUisMissingSection } from "../types/api.types"

export const MISSING_SECTION_LABELS: Record<ApiUisMissingSection, string> = {
  assessment: "Intake Assessment",
  informant: "Informant Details",
  family_composition: "Family Composition",
  family_income: "Family Income & Sources",
  problem_presented: "Presenting Problem",
  recommendation: "Social Worker Recommendation",
}
