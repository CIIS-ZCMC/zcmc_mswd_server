export const HOUSE_TENURE_OPTIONS = [
  { value: "owned", label: "Owned" },
  { value: "rented", label: "Rented" },
] as const

export const LIGHT_SOURCE_OPTIONS = [
  { value: "electricity", label: "Electricity" },
  { value: "kerosene", label: "Kerosene" },
  { value: "candle", label: "Candle" },
] as const

export const WATER_SOURCE_OPTIONS = [
  { value: "owned", label: "Owned" },
  { value: "public", label: "Public" },
  { value: "artesian_well", label: "Artesian Well" },
] as const

/**
 * The label for a stored option value. A value outside the list (legacy
 * free text, or something typed in the admin panel) is shown as stored.
 */
export function labelFor(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string | null | undefined
): string | null {
  if (!value) return null
  return options.find((o) => o.value === value)?.label ?? value
}
