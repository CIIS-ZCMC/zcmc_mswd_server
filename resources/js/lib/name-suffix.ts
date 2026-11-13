/**
 * Standard name suffixes / extension names (Jr., Sr., II, III, IV, V, VI).
 */

export const NAME_SUFFIX_OPTIONS = [
  "Jr.",
  "Sr.",
  "II",
  "III",
  "IV",
  "V",
  "VI",
] as const

export const NONE_SUFFIX_VALUE = "__none__"

/**
 * Normalizes a stored or legacy suffix string (e.g. "jr", "JR.", "iii") to
 * the canonical option in `NAME_SUFFIX_OPTIONS` when matched, or trims it.
 */
export function normalizeNameSuffix(raw?: string | null): string {
  if (!raw) return ""
  const trimmed = raw.trim()
  if (!trimmed || trimmed === NONE_SUFFIX_VALUE) return ""

  const bare = trimmed.replace(/\./g, "").toLowerCase()
  for (const opt of NAME_SUFFIX_OPTIONS) {
    if (opt.replace(/\./g, "").toLowerCase() === bare) {
      return opt
    }
  }
  return trimmed
}

/**
 * Extracts a trailing standard suffix from a full name string if present.
 */
export function extractSuffixFromNameParts(parts: string[]): {
  remaining: string[]
  extensionName: string
} {
  if (parts.length < 2) {
    return { remaining: parts, extensionName: "" }
  }
  const lastToken = parts[parts.length - 1].replace(/,/g, "")
  const matched = NAME_SUFFIX_OPTIONS.find(
    (opt) =>
      opt.replace(/\./g, "").toLowerCase() ===
      lastToken.replace(/\./g, "").toLowerCase()
  )
  if (matched) {
    return {
      remaining: parts.slice(0, -1),
      extensionName: matched,
    }
  }
  return { remaining: parts, extensionName: "" }
}

