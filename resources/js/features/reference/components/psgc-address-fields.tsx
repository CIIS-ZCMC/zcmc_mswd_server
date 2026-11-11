import { useEffect, useId, useMemo, useState } from "react"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  usePsgcBarangays,
  usePsgcCity,
  usePsgcCitySearch,
} from "../hooks/use-psgc"
import type {
  PsgcAddressValue,
  PsgcBarangay,
  PsgcCity,
} from "../types/psgc.types"

/** Wait this long after typing before asking the server (matches the search dialog). */
const SEARCH_DEBOUNCE_MS = 280

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

interface PsgcCityComboboxProps {
  id?: string
  cityCode: string | null
  onChange: (city: PsgcCity | null) => void
  disabled?: boolean
  invalid?: boolean
  placeholder?: string
}

/**
 * Search-as-you-type picker for a city, municipality or Manila district.
 * Matching is done by the server (name, or its province), so the list is
 * never the whole of the Philippines.
 */
function PsgcCityCombobox({
  id,
  cityCode,
  onChange,
  disabled,
  invalid,
  placeholder = "Search city or municipality",
}: PsgcCityComboboxProps) {
  const [input, setInput] = useState("")
  const search = useDebounced(input.trim(), SEARCH_DEBOUNCE_MS)
  const { data: found = [], isFetching } = usePsgcCitySearch(search)
  const { data: saved } = usePsgcCity(cityCode)

  const selected = useMemo(
    () => found.find((c) => c.code === cityCode) ?? saved ?? null,
    [found, saved, cityCode]
  )

  // The chosen city stays in the list even when the typed text no longer finds it.
  const items = useMemo(
    () =>
      selected && !found.some((c) => c.code === selected.code)
        ? [selected, ...found]
        : found,
    [found, selected]
  )

  // Show the saved city's name, and clear the box when the value is cleared.
  const selectedLabel = selected?.label ?? ""
  useEffect(() => {
    setInput(selectedLabel)
  }, [selectedLabel])

  return (
    <Combobox<PsgcCity>
      items={items}
      value={selected}
      onValueChange={(city) => onChange(city)}
      inputValue={input}
      onInputValueChange={(text) => setInput(text)}
      onOpenChange={(open) => {
        if (!open) setInput(selectedLabel)
      }}
      // The server filters; the list is already what matched.
      filter={null}
      itemToStringLabel={(city) => city.label}
      isItemEqualToValue={(a, b) => a.code === b.code}
      disabled={disabled}
    >
      <ComboboxInput
        id={id}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        showClear={cityCode !== null}
        autoComplete="off"
      />
      <ComboboxContent>
        <ComboboxEmpty>
          {isFetching ? "Searching…" : "No city or municipality found"}
        </ComboboxEmpty>
        <ComboboxList>
          {(city: PsgcCity) => (
            <ComboboxItem key={city.code} value={city}>
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{city.label}</span>
                <span className="truncate text-[0.7rem] text-muted-foreground">
                  {[city.province?.name, city.region?.name]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

interface PsgcBarangayComboboxProps {
  id?: string
  cityCode: string | null
  barangayCode: string | null
  onChange: (barangay: PsgcBarangay | null) => void
  disabled?: boolean
  invalid?: boolean
}

/** Picker for one of the chosen city's barangays; the list is small, so the browser filters it. */
function PsgcBarangayCombobox({
  id,
  cityCode,
  barangayCode,
  onChange,
  disabled,
  invalid,
}: PsgcBarangayComboboxProps) {
  const { data: barangays = [], isLoading } = usePsgcBarangays(cityCode)

  const selected = useMemo(
    () => barangays.find((b) => b.code === barangayCode) ?? null,
    [barangays, barangayCode]
  )

  return (
    <Combobox<PsgcBarangay>
      items={barangays}
      value={selected}
      onValueChange={(barangay) => onChange(barangay)}
      itemToStringLabel={(barangay) => barangay.name}
      isItemEqualToValue={(a, b) => a.code === b.code}
      disabled={disabled || cityCode === null}
    >
      <ComboboxInput
        id={id}
        placeholder={cityCode ? "Search barangay" : "Pick the city first"}
        disabled={disabled || cityCode === null}
        aria-invalid={invalid || undefined}
        showClear={barangayCode !== null}
        autoComplete="off"
      />
      <ComboboxContent>
        <ComboboxEmpty>
          {isLoading ? "Loading barangays…" : "No barangay found"}
        </ComboboxEmpty>
        <ComboboxList>
          {(barangay: PsgcBarangay) => (
            <ComboboxItem key={barangay.code} value={barangay}>
              {barangay.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

interface PsgcAddressFieldsProps {
  value: PsgcAddressValue
  onChange: (value: PsgcAddressValue) => void
  /** Labels the three inputs ("Present address" → "Present address line"…). */
  label?: string
  /** The address as free text, for a record not yet picked from PSGC. */
  legacyText?: string | null
  disabled?: boolean
  /** Server validation messages, by part. */
  errors?: { line?: string; city?: string; barangay?: string }
  /** Marks city and barangay as needed. */
  required?: boolean
  lineLabel?: string
  linePlaceholder?: string
}

/**
 * A street line, a city or municipality and a barangay, picked from PSGC.
 * Changing the city clears the barangay, which belongs to it.
 */
export function PsgcAddressFields({
  value,
  onChange,
  label,
  legacyText,
  disabled,
  errors,
  required,
  lineLabel = "House no., street, purok",
  linePlaceholder = "e.g. 123 Rizal St., Purok 2",
}: PsgcAddressFieldsProps) {
  const uid = useId()
  const lineId = `${uid}-line`
  const cityId = `${uid}-city`
  const barangayId = `${uid}-barangay`
  const star = required ? " *" : ""

  return (
    <div className="flex flex-col gap-2.5" data-slot="psgc-address-fields">
      {label && <p className="text-xs font-medium">{label}</p>}

      {legacyText && value.cityCode === null && (
        <p className="rounded-md bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-400">
          Not matched to PSGC: “{legacyText}”. Pick the area below to replace it.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={lineId} className="text-xs text-muted-foreground">
          {lineLabel}
        </Label>
        <Input
          id={lineId}
          value={value.line}
          placeholder={linePlaceholder}
          maxLength={255}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, line: e.target.value })}
        />
        {errors?.line && <p className="text-xs text-destructive">{errors.line}</p>}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={cityId} className="text-xs text-muted-foreground">
            City / Municipality{star}
          </Label>
          <PsgcCityCombobox
            id={cityId}
            cityCode={value.cityCode}
            disabled={disabled}
            invalid={!!errors?.city}
            onChange={(city) =>
              onChange({
                ...value,
                cityCode: city?.code ?? null,
                // The barangay belongs to the city, so it goes with it.
                barangayCode: null,
              })
            }
          />
          {errors?.city && <p className="text-xs text-destructive">{errors.city}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={barangayId} className="text-xs text-muted-foreground">
            Barangay{star}
          </Label>
          <PsgcBarangayCombobox
            id={barangayId}
            cityCode={value.cityCode}
            barangayCode={value.barangayCode}
            disabled={disabled}
            invalid={!!errors?.barangay}
            onChange={(barangay) =>
              onChange({ ...value, barangayCode: barangay?.code ?? null })
            }
          />
          {errors?.barangay && (
            <p className="text-xs text-destructive">{errors.barangay}</p>
          )}
        </div>
      </div>
    </div>
  )
}

interface PsgcCityPickerProps {
  id?: string
  value: string | null
  onChange: (cityCode: string | null) => void
  /** The place as free text, for a record not yet picked from PSGC. */
  legacyText?: string | null
  disabled?: boolean
  error?: string
}

/** Just a city or municipality, e.g. for place of birth. */
export function PsgcCityPicker({
  id,
  value,
  onChange,
  legacyText,
  disabled,
  error,
}: PsgcCityPickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {legacyText && value === null && (
        <p className="rounded-md bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-400">
          Not matched to PSGC: “{legacyText}”. Pick the city or municipality to replace it.
        </p>
      )}
      <PsgcCityCombobox
        id={id}
        cityCode={value}
        disabled={disabled}
        invalid={!!error}
        onChange={(city) => onChange(city?.code ?? null)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
