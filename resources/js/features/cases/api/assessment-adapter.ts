import type { ApiAssessment, ApiMswdClassificationMatrix, ApiUisSnapshot } from "@/features/patients/types/api.types"
import type {
  Assessment,
  LegacyClassification,
  MswdClassificationCode,
  MswdClassificationMatrix,
  UisSnapshot,
  UisSnapshotFamilyMember,
  UisSnapshotPatient,
} from "../types/assessment.types"

/** A snapshot value as text; blank and missing both read as "not on file". */
function snapshotText(value: unknown): string | null {
  return value === null || value === undefined || value === "" ? null : String(value)
}

function snapshotNumber(value: unknown): number | null {
  return value === null || value === undefined || value === "" ? null : Number(value)
}

function adaptSnapshotPatient(raw: Record<string, unknown>): UisSnapshotPatient {
  return {
    fullName: snapshotText(raw.full_name),
    firstName: snapshotText(raw.first_name),
    middleName: snapshotText(raw.middle_name),
    lastName: snapshotText(raw.last_name),
    extensionName: snapshotText(raw.extension_name),
    sex: snapshotText(raw.sex),
    birthdate: snapshotText(raw.birthdate),
    age: snapshotNumber(raw.age),
    placeOfBirth: snapshotText(raw.place_of_birth),
    civilStatus: snapshotText(raw.civil_status),
    religion: snapshotText(raw.religion),
    nationality: snapshotText(raw.nationality),
    citizenship: snapshotText(raw.citizenship),
    educationalAttainment: snapshotText(raw.educational_attainment),
    occupation: snapshotText(raw.occupation),
    monthlyIncome: snapshotNumber(raw.monthly_income),
    contactNumber: snapshotText(raw.contact_number),
    composedAddress: snapshotText(raw.composed_address),
    permanentAddress: snapshotText(raw.permanent_address),
    presentAddress: snapshotText(raw.present_address),
    hospitalId: snapshotText(raw.hospital_id),
    mswdId: snapshotText(raw.mswd_id),
    philhealthNo: snapshotText(raw.philhealth_no),
  }
}

function adaptSnapshotFamilyMember(raw: Record<string, unknown>): UisSnapshotFamilyMember {
  return {
    name: snapshotText(raw.name),
    relationship: snapshotText(raw.relationship),
    birthdate: snapshotText(raw.birthdate),
    sex: snapshotText(raw.sex),
    civilStatus: snapshotText(raw.civil_status),
    age: snapshotNumber(raw.age),
    educationalAttainment: snapshotText(raw.educational_attainment),
    occupation: snapshotText(raw.occupation),
    monthlyIncome: snapshotNumber(raw.monthly_income),
  }
}

/** The frozen §I/§II copy. Null for a row taken before snapshots existed. */
export function adaptUisSnapshot(api: ApiUisSnapshot | null | undefined): UisSnapshot | null {
  if (!api || !api.patient) return null

  return {
    patient: adaptSnapshotPatient(api.patient),
    familyMembers: (api.family_members ?? []).map(adaptSnapshotFamilyMember),
    householdSize: Number(api.household_size || 1),
    labels: {
      recommendationMode: snapshotText(api.labels?.recommendation_mode),
      fundSource: snapshotText(api.labels?.fund_source),
    },
  }
}

export function adaptMswdClassificationMatrix(
  api: ApiMswdClassificationMatrix
): MswdClassificationMatrix {
  return {
    id: api.id,
    code: api.code as MswdClassificationCode,
    name: api.name,
    minPerCapitaIncome: api.min_per_capita_income !== null ? Number(api.min_per_capita_income) : null,
    maxPerCapitaIncome: api.max_per_capita_income !== null ? Number(api.max_per_capita_income) : null,
    discountPercentage: Number(api.discount_percentage || 0),
    maxAssistanceCap: api.max_assistance_cap !== null ? Number(api.max_assistance_cap) : null,
    isIndigent: Boolean(api.is_indigent),
    description: api.description ?? null,
  }
}

export function adaptAssessment(api: ApiAssessment): Assessment {
  const expenses = (api.expenses || []).map((e) => ({
    id: e.id,
    assessmentId: e.assessment_id,
    expenseType: e.expense_type,
    amount: Number(e.amount || 0),
  }))

  const expensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0)

  return {
    id: api.id,
    caseId: api.case_id ?? null,
    patientId: api.patient_id ?? null,
    hisTransactionId: api.his_transaction_id ?? null,
    transactionType: api.transaction_type ?? null,
    encounterDate: api.encounter_date ?? null,
    createdBy: api.created_by,
    createdByName: api.created_by_user?.name || null,
    parentAssessmentId: api.parent_assessment_id ?? null,
    reassessmentReason: api.reassessment_reason ?? null,
    totalFamilyIncome: api.total_family_income !== null ? Number(api.total_family_income) : null,
    expensesTotal,
    expenses,
    householdSize: api.household_size ?? 1,
    netPerCapitaIncome: api.net_per_capita_income !== null && api.net_per_capita_income !== undefined
      ? Number(api.net_per_capita_income)
      : null,
    calculatedClassification: (api.calculated_classification as MswdClassificationCode) || null,
    // Never default to a bracket: an empty value is "not on file", not class D.
    classification: (api.classification as MswdClassificationCode | LegacyClassification) || null,
    classificationOverrideReason: api.classification_override_reason ?? null,
    calculatedDiscountRate: api.calculated_discount_rate !== undefined && api.calculated_discount_rate !== null
      ? Number(api.calculated_discount_rate)
      : null,
    hasOverride: Boolean(api.has_override),
    housingType: api.housing_type ?? null,
    utilitiesAccess: api.utilities_access ?? null,
    houseTenure: api.house_tenure ?? null,
    lightSource: api.light_source ?? [],
    waterSource: api.water_source ?? [],
    presentingProblem: api.presenting_problem ?? null,
    problemCategories: api.problem_categories ?? [],
    problemSpecify: api.problem_specify ?? null,
    informantName: api.informant_name ?? null,
    informantFirstName: api.informant_first_name ?? null,
    informantMiddleName: api.informant_middle_name ?? null,
    informantLastName: api.informant_last_name ?? null,
    informantRelationship: api.informant_relationship ?? null,
    informantAddress: api.informant_address ?? null,
    informantContact: api.informant_contact_number ?? api.informant_contact ?? null,
    otherIncomeSources: (api.other_income_sources ?? []).map((i) => ({
      source: i.source,
      amount: i.amount !== null && i.amount !== undefined ? Number(i.amount) : null,
    })),
    referralSource: api.referral_source ?? null,
    medicalHistory: api.medical_history ?? null,
    recommendation: api.recommendation ?? null,
    recommendationMode: api.recommendation_mode ?? null,
    fundSource: api.fund_source ?? null,
    familyBackground: api.family_background ?? null,
    socialFunctioning: api.social_functioning ?? null,
    assessmentNotes: api.assessment_notes ?? null,
    interventionPlan: api.intervention_plan ?? null,
    socialCaseStatus: api.social_case_status ?? null,
    parentAssessment: api.parent_assessment ? adaptAssessment(api.parent_assessment) : null,
    uisSnapshot: adaptUisSnapshot(api.uis_snapshot),
    uisSnapshotAt: api.uis_snapshot_at ?? null,
    uisSnapshotBy: api.uis_snapshot_by ?? null,
    socioeconomicProfileId: api.socioeconomic_profile_id ?? null,
    socioeconomicImportedAt: api.socioeconomic_imported_at ?? null,
    interviewedAt: api.interviewed_at ?? null,
    interviewedBy: api.interviewed_by ?? null,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  }
}
