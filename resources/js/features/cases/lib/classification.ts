import type { MswdClassificationCode } from "../types/assessment.types"

export const LEGACY_CLASSIFICATIONS = ["indigent", "low_income", "self_sufficient", "others"]

export const isLegacyClassification = (code: string | null) =>
  code !== null && LEGACY_CLASSIFICATIONS.includes(code)

/**
 * Short badge text. Pre-MSWD rows hold a legacy word (indigent, …) — shown as
 * such, never mapped to a bracket; a missing value is "not on file", not a class.
 */
export const getClassificationBadgeText = (code: MswdClassificationCode | string | null) => {
  if (!code) return "Not on file"
  if (isLegacyClassification(code)) return `${code.replace(/_/g, " ")} (legacy)`
  return `Class ${code}`
}

export const getBracketColor = (code: MswdClassificationCode | string | null) => {
  switch (code) {
    case "A":
      return "bg-slate-700 hover:bg-slate-800 text-white border-slate-600"
    case "B":
      return "bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
    case "C1":
      return "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500"
    case "C2":
      return "bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
    case "C3":
      return "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500"
    case "D":
      return "bg-teal-600 hover:bg-teal-700 text-white border-teal-500"
    default:
      return isLegacyClassification(code) || !code
        ? "bg-muted text-muted-foreground border-border"
        : "bg-slate-600 text-white"
  }
}

export const getBracketLabel = (code: MswdClassificationCode | string | null) => {
  switch (code) {
    case "A":
      return "Class A — Full Pay"
    case "B":
      return "Class B — Partial Pay (25% Discount)"
    case "C1":
      return "Class C1 — Partial Pay (50% Discount)"
    case "C2":
      return "Class C2 — Partial Pay (75% Discount)"
    case "C3":
      return "Class C3 — Financially Indigent (100% Discount)"
    case "D":
      return "Class D — Financially Indigent / Support (100% Discount)"
    default:
      if (!code) return "Classification not on file"
      if (isLegacyClassification(code)) return "Legacy classification — recorded before the MSWD brackets"
      return `Class ${code}`
  }
}

export { formatCurrency } from "@/lib/format-currency"
