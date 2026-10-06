/**
 * Snake_case wire types matching server JSON representations for List of Expenses module.
 */

export interface ApiEnvelope<T> {
  data: T
}

export interface ApiRecordedBy {
  id: number
  name: string
}

export interface ApiHouse {
  tenure: string | null
  rent_amount: number | null
}

export interface ApiExpenseItems {
  food: number | null
  transport: number | null
  medical: number | null
  insurance: number | null
  education: number | null
  clothing: number | null
  house_help: number | null
  others: number | null
  others_specify: string | null
}

export interface ApiFamilyMemberIncome {
  name: string
  relationship: string | null
  monthly_income: number | null
}

export interface ApiOtherIncomeSource {
  source: string
  amount: number
}

export interface ApiProfileIncome {
  patient_income: number | null
  family_members: ApiFamilyMemberIncome[]
  family_members_total: number | null
  other_sources: ApiOtherIncomeSource[]
  other_sources_total: number | null
  total_family_income: number | null
  balance: number | null
  expense_to_income_ratio: number | null
  income_changed: boolean
}

export interface ApiLiveFamilyMemberIncome {
  id: number
  name: string
  relationship: string | null
  monthly_income: number | null
}

export interface ApiLiveIncome {
  patient_income: number | null
  family_members: ApiLiveFamilyMemberIncome[]
  family_members_total: number | null
  total: number | null
}

export interface ApiSocioeconomicCurrent {
  id: number
  patient_id: number
  recorded_on: string
  recorded_by: ApiRecordedBy | null
  remarks: string | null
  house: ApiHouse
  light_source: string[]
  water_source: string[]
  expenses: ApiExpenseItems
  total: number | null
  income: ApiProfileIncome
}

export interface ApiSocioeconomicHistoryItem {
  id: number
  recorded_on: string
  house_tenure: string | null
  total: number | null
  total_family_income: number | null
  balance: number | null
}

export interface ApiSocioeconomicOverview {
  current: ApiSocioeconomicCurrent | null
  live_income: ApiLiveIncome
  history: ApiSocioeconomicHistoryItem[]
}

export type ApiSocioeconomicProfile = ApiSocioeconomicCurrent

export interface ApiSaveSocioeconomicPayload {
  recorded_on: string
  house_tenure: string | null
  house_rent_amount: number | null
  light_source: string[]
  water_source: string[]
  food: number | null
  transport: number | null
  medical: number | null
  insurance: number | null
  education: number | null
  clothing: number | null
  house_help: number | null
  others: number | null
  others_specify: string | null
  other_income_sources: ApiOtherIncomeSource[]
  remarks: string | null
  refresh_income?: boolean
}
