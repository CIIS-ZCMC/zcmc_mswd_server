/**
 * CamelCase domain models for the List of Expenses module.
 */

export interface RecordedBy {
  id: number
  name: string
}

export interface HouseLiving {
  tenure: string | null
  rentAmount: number | null
}

export interface ExpenseItems {
  food: number | null
  transport: number | null
  medical: number | null
  insurance: number | null
  education: number | null
  clothing: number | null
  houseHelp: number | null
  others: number | null
  othersSpecify: string | null
}

export interface FamilyMemberIncome {
  name: string
  relationship: string | null
  monthlyIncome: number | null
}

export interface OtherIncomeSource {
  source: string
  amount: number
}

export interface ProfileIncome {
  patientIncome: number | null
  familyMembers: FamilyMemberIncome[]
  familyMembersTotal: number | null
  otherSources: OtherIncomeSource[]
  otherSourcesTotal: number | null
  totalFamilyIncome: number | null
  balance: number | null
  expenseToIncomeRatio: number | null
  incomeChanged: boolean
}

export interface LiveFamilyMemberIncome {
  id: number
  name: string
  relationship: string | null
  monthlyIncome: number | null
}

export interface LiveIncome {
  patientIncome: number | null
  familyMembers: LiveFamilyMemberIncome[]
  familyMembersTotal: number | null
  total: number | null
}

export interface SocioeconomicCurrent {
  id: number
  patientId: number
  recordedOn: string
  recordedBy: RecordedBy | null
  remarks: string | null
  house: HouseLiving
  lightSource: string[]
  waterSource: string[]
  expenses: ExpenseItems
  total: number | null
  income: ProfileIncome
}

export interface SocioeconomicHistoryItem {
  id: number
  recordedOn: string
  houseTenure: string | null
  total: number | null
  totalFamilyIncome: number | null
  balance: number | null
}

export interface SocioeconomicOverview {
  current: SocioeconomicCurrent | null
  liveIncome: LiveIncome
  history: SocioeconomicHistoryItem[]
}

export type SocioeconomicProfile = SocioeconomicCurrent

export interface SaveSocioeconomicInput {
  recordedOn: string
  houseTenure: string | null
  houseRentAmount: number | null
  lightSource: string[]
  waterSource: string[]
  food: number | null
  transport: number | null
  medical: number | null
  insurance: number | null
  education: number | null
  clothing: number | null
  houseHelp: number | null
  others: number | null
  othersSpecify: string | null
  otherIncomeSources: OtherIncomeSource[]
  remarks: string | null
  refreshIncome?: boolean
}
