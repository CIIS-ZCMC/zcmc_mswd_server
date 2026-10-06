import type {
  ApiSocioeconomicOverview,
  ApiSocioeconomicCurrent,
  ApiSaveSocioeconomicPayload,
} from "../types/api.types"
import type {
  SocioeconomicOverview,
  SocioeconomicCurrent,
  SaveSocioeconomicInput,
} from "../types/socioeconomic.types"

export function toSocioeconomicCurrent(api: ApiSocioeconomicCurrent): SocioeconomicCurrent {
  return {
    id: api.id,
    patientId: api.patient_id,
    recordedOn: api.recorded_on,
    recordedBy: api.recorded_by ? { id: api.recorded_by.id, name: api.recorded_by.name } : null,
    remarks: api.remarks,
    house: {
      tenure: api.house?.tenure ?? null,
      rentAmount: api.house?.rent_amount ?? null,
    },
    lightSource: Array.isArray(api.light_source) ? api.light_source : [],
    waterSource: Array.isArray(api.water_source) ? api.water_source : [],
    expenses: {
      food: api.expenses?.food ?? null,
      transport: api.expenses?.transport ?? null,
      medical: api.expenses?.medical ?? null,
      insurance: api.expenses?.insurance ?? null,
      education: api.expenses?.education ?? null,
      clothing: api.expenses?.clothing ?? null,
      houseHelp: api.expenses?.house_help ?? null,
      others: api.expenses?.others ?? null,
      othersSpecify: api.expenses?.others_specify ?? null,
    },
    total: api.total ?? null,
    income: {
      patientIncome: api.income?.patient_income ?? null,
      familyMembers: (api.income?.family_members || []).map((fm) => ({
        name: fm.name,
        relationship: fm.relationship,
        monthlyIncome: fm.monthly_income,
      })),
      familyMembersTotal: api.income?.family_members_total ?? null,
      otherSources: (api.income?.other_sources || []).map((os) => ({
        source: os.source,
        amount: os.amount,
      })),
      otherSourcesTotal: api.income?.other_sources_total ?? null,
      totalFamilyIncome: api.income?.total_family_income ?? null,
      balance: api.income?.balance ?? null,
      expenseToIncomeRatio: api.income?.expense_to_income_ratio ?? null,
      incomeChanged: Boolean(api.income?.income_changed),
    },
  }
}

export function toSocioeconomicOverview(api: ApiSocioeconomicOverview): SocioeconomicOverview {
  return {
    current: api.current ? toSocioeconomicCurrent(api.current) : null,
    liveIncome: {
      patientIncome: api.live_income?.patient_income ?? null,
      familyMembers: (api.live_income?.family_members || []).map((fm) => ({
        id: fm.id,
        name: fm.name,
        relationship: fm.relationship,
        monthlyIncome: fm.monthly_income,
      })),
      familyMembersTotal: api.live_income?.family_members_total ?? null,
      total: api.live_income?.total ?? null,
    },
    history: (api.history || []).map((h) => ({
      id: h.id,
      recordedOn: h.recorded_on,
      houseTenure: h.house_tenure,
      total: h.total,
      totalFamilyIncome: h.total_family_income,
      balance: h.balance,
    })),
  }
}

export function toApiSaveSocioeconomicPayload(input: SaveSocioeconomicInput): ApiSaveSocioeconomicPayload {
  return {
    recorded_on: input.recordedOn,
    house_tenure: input.houseTenure || null,
    house_rent_amount: input.houseTenure === "rented" ? input.houseRentAmount : null,
    light_source: input.lightSource,
    water_source: input.waterSource,
    food: input.food,
    transport: input.transport,
    medical: input.medical,
    insurance: input.insurance,
    education: input.education,
    clothing: input.clothing,
    house_help: input.houseHelp,
    others: input.others,
    others_specify: input.othersSpecify || null,
    other_income_sources: input.otherIncomeSources.map((os) => ({
      source: os.source.trim(),
      amount: os.amount,
    })),
    remarks: input.remarks ? input.remarks.trim() : null,
    ...(input.refreshIncome !== undefined ? { refresh_income: input.refreshIncome } : {}),
  }
}
