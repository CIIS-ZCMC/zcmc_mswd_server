/**
 * Philippine standard mobile number utilities (+63-9XXXXXXXXX).
 *
 * UI inputs display a fixed `+63 -` prefix badge and hold the 10-digit
 * subscriber number starting with `9` (e.g. `9171234567`). Payloads sent to
 * the server are formatted as `+63-9171234567`.
 */

/**
 * Extracts the 10-digit subscriber number (`9XXXXXXXXX`) from a stored or
 * pasted phone string (`+63-9171234567`, `09171234567`, `9171234567`, etc.).
 *
 * Also strips a leading `0` when typing directly into a `+63 -` input so
 * users who habitually type `09...` don't lose the last digit.
 */
export function extract10DigitPhPhone(raw?: string | null): string {
  if (!raw) return ""
  const digits = raw.replace(/\D/g, "")
  if (!digits) return ""

  if (digits.startsWith("639") && digits.length >= 12) {
    return digits.slice(2, 12)
  }
  if (digits.startsWith("09") && digits.length >= 11) {
    return digits.slice(1, 11)
  }
  if (digits.startsWith("63") && digits.length > 10) {
    return digits.slice(2, 12)
  }
  if (digits.startsWith("0")) {
    return digits.slice(1, 11)
  }

  return digits.slice(0, 10)
}

/**
 * Checks whether a 10-digit subscriber number is valid (`9XXXXXXXXX`).
 * When `required` is false, an empty string is also valid.
 */
export function isValidPhPhone10(digits10: string, required = false): boolean {
  const trimmed = digits10.trim()
  if (trimmed === "") return !required
  return /^9\d{9}$/.test(trimmed)
}

/**
 * Formats a 10-digit subscriber number as `+63-9XXXXXXXXX`.
 * Returns `""` if empty.
 */
export function formatPhPhonePayload(digits10: string): string {
  const cleaned = extract10DigitPhPhone(digits10)
  if (!cleaned) return ""
  return `+63-${cleaned}`
}

