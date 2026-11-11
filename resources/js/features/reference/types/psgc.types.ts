/** A city, municipality or Manila district (SubMun) that has barangays. */
export interface PsgcCity {
  code: string
  name: string
  /** Names the city for a Manila district: "Tondo I/II, City of Manila". */
  label: string
  kind: string | null
  /** Null for independent cities (Zamboanga City) and NCR. */
  province: { code: string; name: string } | null
  region: { code: string; name: string } | null
}

export interface PsgcBarangay {
  code: string
  name: string
}

/**
 * An address as the picker holds it: a free-text line (house, street, purok)
 * plus a PSGC city or municipality and one of its barangays.
 */
export interface PsgcAddressValue {
  line: string
  cityCode: string | null
  barangayCode: string | null
}

export const EMPTY_PSGC_ADDRESS: PsgcAddressValue = {
  line: "",
  cityCode: null,
  barangayCode: null,
}
