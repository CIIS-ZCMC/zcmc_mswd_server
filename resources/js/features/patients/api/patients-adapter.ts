/**
 * Assembles the UI's `PatientRecord` shape (designed around a flat,
 * single-episode mock model) from the backend's normalized, episode-driven
 * resources (Patient, Case, Assessment, ...).
 *
 * Ground rules applied throughout (per product decision, 2026-08-31):
 *  - Never fabricate a value for a field the backend doesn't track. Real
 *    data or an honest placeholder ("Not on file", "Not tracked") — never a
 *    plausible-looking guess. This matters more than usual here: this is a
 *    hospital case-management system, and an invented physician's name or
 *    classification would be actively misleading, not just a UI nicety.
 *  - "Most recent case" stands in for "the patient's episode" everywhere a
 *    single case/classification is expected. A patient with two concurrent
 *    open cases will only show one here — known limitation, not a bug.
 *  - There is no stored "Intake Sheet" record any more: the Unified Intake Sheet
 *    (ANNEX B) is a printable the server renders from a case, with a print history
 *    (see features/cases/api/uis-print-api.ts).
 */
import type { FamilyMember, MedicalCategory, StaffAssignment } from "../types/case-study.types"
import type { DocumentItem } from "../types/document.types"
import type { AuditEvent, AuditFieldChange, AuditHistory } from "../types/audit.types"
import type { CaretakerAssignment, CaretakerRole } from "../types/caretake.types"
import { CARETAKER_ROLES } from "../types/caretake.types"
import type { PatientIdCredential, PatientRecord } from "../types/patient.types"
import type { Watcher } from "../types/watcher.types"
import type {
  ApiActivity,
  ApiAssessment,
  ApiCaretaker,
  ApiCase,
  ApiDocument,
  ApiFamilyMember,
  ApiPatient,
  ApiPatientId,
  ApiWatcher,
} from "../types/api.types"

const NOT_ON_FILE = "Not on file"
const NOT_TRACKED = "Not tracked"

export interface PatientDetailExtras {
  latestCase?: ApiCase | null
  latestAssessment?: ApiAssessment | null
  history?: ApiActivity[]
}

/**
 * `raw.patient_ids[].id_type` is a completely free-text Filament field (no
 * select options, no enum) — there is no defined convention for how
 * "PhilHealth" vs "Senior Citizen" vs "PWD" get spelled. This does a
 * best-effort case-insensitive match against real stored records; it never
 * invents a number. Revisit once real data-entry conventions are settled.
 */
function findIdNumber(patientIds: ApiPatientId[] | undefined, keywords: string[]): string | undefined {
  if (!patientIds) return undefined
  const match = patientIds.find((pid) =>
    keywords.some((kw) => pid.id_type.toLowerCase().includes(kw))
  )
  return match?.id_number
}

function buildFullName(raw: ApiPatient): string {
  const middleInitial = raw.middle_name ? `${raw.middle_name.charAt(0)}.` : ""
  return [raw.first_name, middleInitial, raw.last_name, raw.extension_name]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
}

function computeAge(birthdate: string | null): number {
  if (!birthdate) return 0
  const dob = new Date(birthdate)
  if (Number.isNaN(dob.getTime())) return 0
  const diff = Date.now() - dob.getTime()
  return Math.max(0, Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)))
}

/**
 * Backend `classification` values (per the assessments migration comment):
 * indigent, low_income, self_sufficient, others. No enum is enforced, so
 * anything else stored gets a generic title-case fallback rather than
 * being hidden.
 */
function classificationLabel(raw: string | undefined | null): MedicalCategory {
  if (!raw) return "Unclassified"
  const known: Record<string, string> = {
    indigent: "Indigent",
    low_income: "Low Income",
    self_sufficient: "Self-Sufficient",
    others: "Others",
  }
  return known[raw] ?? raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function buildClassificationSummary(assessment: ApiAssessment | null | undefined): string {
  if (!assessment) return "No assessment recorded yet."
  const parts: string[] = []
  if (assessment.housing_type) parts.push(`Housing: ${assessment.housing_type}`)
  if (assessment.utilities_access) parts.push(`Utilities: ${assessment.utilities_access}`)
  if (assessment.total_family_income != null) {
    parts.push(`Monthly family income: ₱${Number(assessment.total_family_income).toLocaleString()}`)
  }
  return parts.length > 0 ? parts.join(" • ") : "No income/housing basis recorded."
}

function toFamilyMember(raw: ApiFamilyMember): FamilyMember {
  return {
    id: String(raw.id),
    fullName: raw.name,
    relationship: raw.relationship ?? "",
    // The resource casts this to a date, so it arrives as a full ISO datetime;
    // trim it to what <input type="date"> accepts.
    birthdate: raw.birthdate?.slice(0, 10) ?? "",
    sex: raw.sex ?? "",
    age: raw.age ?? 0,
    civilStatus: raw.civil_status ?? "",
    occupation: raw.occupation ?? "",
    monthlyIncome: raw.monthly_income != null ? Number(raw.monthly_income) : 0,
    educationalAttainment: raw.educational_attainment ?? "",
    contactNumber: raw.contact_number ?? "",
    isLivingWithPatient: raw.is_living_with_patient,
  }
}

function toWatcher(raw: ApiWatcher): Watcher {
  return {
    id: String(raw.id),
    fullName: raw.name,
    relationship: raw.relationship ?? "",
    contactNo: raw.contact_number ?? "",
    // No pass-number/expiry/status columns exist on the backend at all.
    passNo: NOT_TRACKED,
    validUntil: "—",
    status: NOT_TRACKED,
  }
}

function toDocumentItem(raw: ApiDocument): DocumentItem {
  return {
    id: String(raw.id),
    title: raw.file_name,
    category: raw.document_type,
    uploadDate: raw.created_at,
    // No verification workflow or size tracking on the Document model.
    status: NOT_TRACKED,
    fileSize: "—",
  }
}

/** `monthly_income` → "Monthly income". No server-side label map exists yet. */
function fieldLabel(field: string): string {
  return field.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
}

/**
 * Flattens spatie's `{ attributes, old }` into one row per changed field.
 * Keys are taken from both sides unioned, so a create (no `old`) and a
 * delete (no `attributes`) both still produce rows, with the missing side
 * left `undefined` for the renderer to interpret.
 */
function toFieldChanges(changes: ApiActivity["changes"]): AuditFieldChange[] {
  if (!changes) return []
  const next = changes.attributes ?? {}
  const previous = changes.old ?? {}
  const fields = new Set([...Object.keys(next), ...Object.keys(previous)])

  return [...fields].map((field) => ({
    field,
    label: fieldLabel(field),
    from: previous[field],
    to: next[field],
  }))
}

function toAuditEvent(raw: string | null): AuditEvent {
  if (raw === "created" || raw === "deleted" || raw === "restored") return raw
  return "updated"
}

/**
 * `subject_label` is the server's identifying string for the record
 * ("Watcher: Maria Cruz"); without it, two "Updated" rows on different
 * record types are indistinguishable, so the subject type is the fallback
 * rather than the event alone.
 */
function buildActionLabel(subjectLabel: string, event: AuditEvent): string {
  return `${subjectLabel} ${event}`
}

function toAuditHistory(raw: ApiActivity): AuditHistory {
  const event = toAuditEvent(raw.event)
  const subjectLabel = raw.subject_label || raw.subject_type

  return {
    id: String(raw.id),
    timestamp: raw.created_at,
    event,
    action: buildActionLabel(subjectLabel, event),
    performedBy: raw.causer?.name ?? "System",
    subjectType: raw.subject_type,
    subjectId: String(raw.subject_id),
    subjectLabel,
    patientId: raw.patient_id != null ? String(raw.patient_id) : undefined,
    caseId: raw.case_id != null ? String(raw.case_id) : undefined,
    details: raw.description,
    changes: toFieldChanges(raw.changes),
  }
}

/** `role` is an unvalidated string column server-side; fold the unknown into "others". */
function toCaretakerRole(raw: string): CaretakerRole {
  return (CARETAKER_ROLES as readonly string[]).includes(raw) ? (raw as CaretakerRole) : "others"
}

export function toCaretakerAssignment(raw: ApiCaretaker): CaretakerAssignment {
  return {
    id: String(raw.id),
    // `user` is only eager-loaded once the server's Phase 3 lands; until
    // then the id is all there is, and showing it beats inventing a name.
    user: {
      id: String(raw.user?.id ?? raw.user_id),
      name: raw.user?.name ?? `User #${raw.user_id}`,
    },
    role: toCaretakerRole(raw.role),
    assignedDate: raw.assigned_date,
    assignedBy: raw.assigned_by?.name ?? "",
    reason: raw.reason ?? "",
    unassignedDate: raw.unassigned_date ?? undefined,
    unassignedBy: raw.unassigned_by?.name ?? undefined,
    unassignedReason: raw.unassigned_reason ?? undefined,
    replacedById: raw.replaced_by_id != null ? String(raw.replaced_by_id) : undefined,
    isActive: raw.is_active,
  }
}

/**
 * The handler of the latest *episode*, which is genuinely
 * `cases.assigned_user` — custody is a separate, patient-level concern and
 * now lives on `PatientRecord.caretakers`.
 */
function buildAssignedStaff(latestCase: ApiCase | null | undefined): StaffAssignment {
  return {
    socialWorker: latestCase?.assigned_user?.name ?? "Unassigned",
    // Attending physician is clinical data — out of scope for this system
    // per the project's own module boundaries; never sourced from MSS data.
    attendingPhysician: "Not tracked (outside MSS system scope)",
    assignedDate: latestCase?.date_opened ?? "",
  }
}

/**
 * List-view mapping: reads demographics along with embedded relations
 * (`latest_case`, `latest_assessment`) eager-loaded by the server.
 */
function toPatientIdCredential(raw: ApiPatientId): PatientIdCredential {
  return {
    id: String(raw.id),
    idType: raw.id_type,
    idNumber: raw.id_number,
    dateIssued: raw.date_issued ?? undefined,
    dateExpiry: raw.date_expiry ?? undefined,
    isVerified: raw.is_verified,
    status: raw.is_verified ? "Verified" : "Active",
  }
}

export function toPatientListRecord(raw: ApiPatient): PatientRecord {
  const latestCase = raw.latest_case
  const latestAssessment = raw.latest_assessment

  return {
    id: String(raw.id),
    latestCaseId: latestCase?.id,
    hospitalId: raw.hospital_id ?? undefined,
    hospitalNo: raw.hospital_id != null ? String(raw.hospital_id) : "—",
    mswdNo: raw.mswd_id != null ? String(raw.mswd_id) : "—",
    fullName: buildFullName(raw),
    age: raw.estimated_age ?? computeAge(raw.birthdate),
    gender: raw.sex,
    birthDate: raw.birthdate ?? "",
    civilStatus: raw.civil_status ?? "",
    contactNo: raw.contact_number ?? "",
    address: raw.address ?? "",
    barangay: raw.barangay ?? "",
    city: raw.municipality ?? "",
    intakeDate: latestCase?.date_opened ?? raw.created_at,
    admissionStatus: latestCase?.admission_type ?? "Unknown",
    ward: NOT_ON_FILE,
    bedNo: NOT_ON_FILE,
    diagnosis: "Not recorded in this view",
    category: classificationLabel(latestAssessment?.classification),
    philHealthNo: findIdNumber(raw.patient_ids, ["philhealth", "phic"]) ?? "",
    seniorCitizenId: findIdNumber(raw.patient_ids, ["senior"]),
    pwdId: findIdNumber(raw.patient_ids, ["pwd"]),
    customIds: (raw.patient_ids ?? []).map(toPatientIdCredential),
    religion: raw.religion ?? undefined,
    nationality: raw.nationality ?? undefined,
    placeOfBirth: raw.place_of_birth ?? undefined,
    permanentAddress: raw.permanent_address ?? undefined,
    presentAddress: raw.present_address ?? undefined,
    educationalAttainment: raw.educational_attainment ?? undefined,
    occupation: raw.occupation ?? undefined,
    employer: raw.employer ?? undefined,
    monthlyIncome: raw.monthly_income != null ? Number(raw.monthly_income) : undefined,
    familyMembers: (raw.family_members ?? []).map(toFamilyMember),
    watchers: (raw.watchers ?? []).map(toWatcher),
    // Eager-loaded by PatientService::profile(); absent on list rows.
    caretakers: (raw.caretakers ?? []).map(toCaretakerAssignment),
    assignedStaff: buildAssignedStaff(latestCase),
    caseStudy: {
      caseNumber: latestCase?.case_code ?? "No active case",
      assessmentDate: latestAssessment?.created_at ?? "",
      category: classificationLabel(latestAssessment?.classification),
      classificationDetails: buildClassificationSummary(latestAssessment),
      presentingProblem: latestAssessment?.presenting_problem ?? "",
      socialWorkerNotes: latestAssessment?.assessment_notes ?? "",
    },
    documents: (raw.documents ?? []).map(toDocumentItem),
    history: [],
  }
}

/**
 * Detail-view mapping: the same base fields as the list, enriched with the
 * patient's most recent case + assessment + audit history — the extra
 * calls `usePatientDetail` makes that a list row doesn't. Falls back to
 * `raw.latest_case` / `raw.latest_assessment` if extras are absent.
 */
export function toPatientDetailRecord(raw: ApiPatient, extras: PatientDetailExtras): PatientRecord {
  const base = toPatientListRecord(raw)
  const latestCase = extras.latestCase ?? raw.latest_case
  const latestAssessment = extras.latestAssessment ?? raw.latest_assessment
  const { history = [] } = extras

  return {
    ...base,
    intakeDate: latestCase?.date_opened ?? base.intakeDate,
    admissionStatus: latestCase?.admission_type ?? "Unknown",
    category: classificationLabel(latestAssessment?.classification),
    assignedStaff: buildAssignedStaff(latestCase),
    caseStudy: {
      caseNumber: latestCase?.case_code ?? "No active case",
      assessmentDate: latestAssessment?.created_at ?? "",
      category: classificationLabel(latestAssessment?.classification),
      classificationDetails: buildClassificationSummary(latestAssessment),
      presentingProblem: latestAssessment?.presenting_problem ?? "",
      socialWorkerNotes: latestAssessment?.assessment_notes ?? "",
    },
    history: history.map(toAuditHistory),
    // extras.latestCase wins over raw.latest_case when the detail query
    // supplied one; fall back to whatever the list record already resolved.
    latestCaseId: latestCase?.id ?? base.latestCaseId,
  }
}
