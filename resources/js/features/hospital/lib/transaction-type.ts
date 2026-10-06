/**
 * Normalizes HIS transaction type abbreviations/codes to full human-readable labels.
 * e.g. "OPD" -> "Outpatient Consultation", "ER" -> "Emergency Room", "ADM" -> "Inpatient Admission".
 */
const TRANSACTION_TYPE_MAP: Record<string, string> = {
  OPD: "Outpatient Consultation",
  O: "Outpatient Consultation",
  OUTPATIENT: "Outpatient Consultation",
  "OUTPATIENT CONSULTATION": "Outpatient Consultation",
  ER: "Emergency Room",
  E: "Emergency Room",
  EMERGENCY: "Emergency Room",
  "EMERGENCY ROOM": "Emergency Room",
  IPD: "Inpatient Admission",
  I: "Inpatient Admission",
  ADM: "Inpatient Admission",
  ADMISSION: "Inpatient Admission",
  INPATIENT: "Inpatient Admission",
  "INPATIENT ADMISSION": "Inpatient Admission",
  WALKIN: "Walk-In Consultation",
  "WALK-IN": "Walk-In Consultation",
  "WALK IN": "Walk-In Consultation",
  DENTAL: "Dental Consultation",
  DIALYSIS: "Hemodialysis",
  HD: "Hemodialysis",
  HEMODIALYSIS: "Hemodialysis",
  TELECONSULT: "Teleconsultation",
  TELEMEDICINE: "Teleconsultation",
  TELE: "Teleconsultation",
  CHEMO: "Chemotherapy",
  CHEMOTHERAPY: "Chemotherapy",
  RADIO: "Radiotherapy",
  RADIOTHERAPY: "Radiotherapy",
  NEWBORN: "Newborn Care",
  NB: "Newborn Care",
}

/**
 * Formats a transaction type string into its full descriptive name.
 * If not recognized in the lookup map, returns the original trimmed string or fallback.
 */
export function formatTransactionType(
  type?: string | null,
  fallback = "Outpatient Consultation"
): string {
  if (!type || type.trim() === "") return fallback
  const cleaned = type.trim()
  const upper = cleaned.toUpperCase()
  return TRANSACTION_TYPE_MAP[upper] ?? cleaned
}
