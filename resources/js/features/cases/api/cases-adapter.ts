import type { CaseCardColor, CaseListItem, CaseRecord } from "../types/case.types"
import { toSocialCase } from "./social-case-adapter"

const VALID_CARD_COLORS: Set<CaseCardColor> = new Set(["white", "green", "orange", "pink"])

function normalizeCardColor(color: unknown): CaseCardColor {
  if (typeof color === "string" && VALID_CARD_COLORS.has(color.toLowerCase() as CaseCardColor)) {
    return color.toLowerCase() as CaseCardColor
  }
  return "white"
}

export function toCaseRecord(raw: any): CaseRecord {
  if (!raw) {
    throw new Error("Cannot adapt null or undefined Case payload")
  }

  const patientRaw = raw.patient || {}
  const assignedUserRaw = raw.assigned_user || (raw.assigned_user_id ? { id: raw.assigned_user_id, name: raw.assigned_user_name } : null)
  const createdByUserRaw = raw.created_by_user || (raw.created_by ? { id: raw.created_by, name: raw.created_by_name } : null)

  return {
    id: raw.id,
    caseCode: raw.case_code ?? `CASE-${raw.id}`,
    patientId: raw.patient_id,
    assignedUserId: raw.assigned_user_id ?? null,
    createdBy: raw.created_by ?? null,
    caseType: raw.case_type ?? null,
    priorityLevel: raw.priority_level ?? "Medium",
    status: raw.status ?? "open",
    admissionType: raw.admission_type ?? null,
    transactionId: raw.transaction_id ?? null,
    transactionType: raw.transaction_type ?? null,
    cardColor: normalizeCardColor(raw.card_color),
    dateOpened: raw.date_opened ?? raw.created_at ?? null,
    dateClosed: raw.date_closed ?? null,
    patient: raw.patient
      ? {
          id: String(patientRaw.id ?? raw.patient_id),
          fullName: patientRaw.full_name ?? `${patientRaw.first_name ?? ""} ${patientRaw.last_name ?? ""}`.trim() ?? "Unknown Patient",
          hospitalNo: patientRaw.hospital_no ?? "—",
          mswdNo: patientRaw.mswd_no ?? "—",
          category: patientRaw.category ?? "Unclassified",
          ward: patientRaw.ward ?? "—",
          bedNo: patientRaw.bed_no ?? "—",
          contactNo: patientRaw.contact_no ?? "—",
        }
      : null,
    assignedUser: assignedUserRaw
      ? {
          id: assignedUserRaw.id,
          name: assignedUserRaw.name ?? `User #${assignedUserRaw.id}`,
          email: assignedUserRaw.email,
        }
      : null,
    createdByUser: createdByUserRaw
      ? {
          id: createdByUserRaw.id,
          name: createdByUserRaw.name ?? `User #${createdByUserRaw.id}`,
          email: createdByUserRaw.email,
        }
      : null,
    socialCase: raw.social_case ? toSocialCase(raw.social_case) : null,

    watchers: raw.watchers ?? [],
    watcherStatus: raw.watcher_status ?? null,
    assessmentsCount: raw.assessments_count ?? raw.assessment_count ?? (Array.isArray(raw.assessments) ? raw.assessments.length : 0),
    watchersCount: raw.watchers_count ?? (Array.isArray(raw.watchers) ? raw.watchers.length : 0),
    createdAt: raw.created_at ?? "",
    updatedAt: raw.updated_at ?? "",
  }
}

export function toCaseListItem(raw: any): CaseListItem {
  if (!raw) {
    throw new Error("Cannot adapt null or undefined CaseListItem payload")
  }

  const patientRaw = raw.patient || {}
  const patientName =
    patientRaw.full_name ??
    (patientRaw.first_name || patientRaw.last_name
      ? `${patientRaw.first_name ?? ""} ${patientRaw.last_name ?? ""}`.trim()
      : `Patient #${raw.patient_id}`)

  return {
    id: raw.id,
    caseCode: raw.case_code ?? `CASE-${raw.id}`,
    patientId: raw.patient_id,
    patientName,
    patientHospitalNo: patientRaw.hospital_no ?? null,
    patientMswdNo: patientRaw.mswd_no ?? null,
    patientCategory: patientRaw.category ?? null,
    assignedUserId: raw.assigned_user_id ?? null,
    assignedUserName: raw.assigned_user?.name ?? raw.assigned_user_name ?? null,
    createdByUserName: raw.created_by_user?.name ?? raw.created_by_name ?? null,
    caseType: raw.case_type ?? null,
    priorityLevel: raw.priority_level ?? "Medium",
    status: raw.status ?? "open",
    admissionType: raw.admission_type ?? null,
    transactionId: raw.transaction_id ?? null,
    transactionType: raw.transaction_type ?? null,
    cardColor: normalizeCardColor(raw.card_color),
    socialCaseStatus: raw.social_case?.status ?? raw.social_case_status ?? null,
    dateOpened: raw.date_opened ?? raw.created_at ?? null,
    dateClosed: raw.date_closed ?? null,
    createdAt: raw.created_at ?? "",
    updatedAt: raw.updated_at ?? "",
  }
}
