import {
  EMPTY_PSGC_ADDRESS,
  type PsgcAddressValue,
} from "../types/psgc.types"

/**
 * The old free-text address to flag as "Not matched to PSGC", or undefined once
 * the record has been picked from PSGC (its composed text is then not "old").
 */
export function legacyAddressText(
  text: string | null | undefined,
  picked: PsgcAddressValue | null | undefined
): string | undefined {
  const trimmed = text?.trim()
  return trimmed && picked?.cityCode == null ? trimmed : undefined
}

/** An address needs both a city or municipality and a barangay to be saved. */
export function isPsgcAddressComplete(value: PsgcAddressValue): boolean {
  return value.cityCode !== null && value.barangayCode !== null
}

/** Nothing entered at all, so there is nothing to save (or to clear). */
export function isPsgcAddressEmpty(value: PsgcAddressValue): boolean {
  return (
    value.line.trim() === "" &&
    value.cityCode === null &&
    value.barangayCode === null
  )
}

/**
 * The request keys for an address under `base` (e.g. "present_address"):
 * `{base}_line`, `{base}_city_code`, `{base}_barangay_code`. The server
 * resolves the region and province and writes the composed string.
 */
export function toPsgcPayload(
  base: string,
  value: PsgcAddressValue
): Record<string, string | null> {
  return {
    [`${base}_line`]: value.line.trim() || null,
    [`${base}_city_code`]: value.cityCode,
    [`${base}_barangay_code`]: value.barangayCode,
  }
}

/** The picker value for an address an API resource returned under `base`. */
export function fromPsgcFields(
  source: Record<string, unknown> | null | undefined,
  base: string
): PsgcAddressValue {
  if (!source) return { ...EMPTY_PSGC_ADDRESS }

  const text = (key: string): string | null => {
    const value = source[`${base}_${key}`]
    return typeof value === "string" && value !== "" ? value : null
  }

  return {
    line: text("line") ?? "",
    cityCode: text("city_code"),
    barangayCode: text("barangay_code"),
  }
}
