import type {
  ApiAssessmentLookup,
  ApiGuarantor,
  ApiSaveAssessmentLookupPayload,
  ApiSaveGuarantorPayload,
  AssessmentLookup,
  Guarantor,
  LookupOption,
  SaveAssessmentLookupInput,
  SaveGuarantorInput,
} from "../types"

export function toAssessmentLookup(raw: ApiAssessmentLookup): AssessmentLookup {
  return {
    id: raw.id,
    name: raw.name ?? "",
    code: raw.code ?? "",
    isActive: Boolean(raw.is_active),
    sortOrder: Number(raw.sort_order ?? 0),
    usageCount: Number(raw.usage_count ?? 0),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

export function toApiSaveAssessmentLookupPayload(
  input: SaveAssessmentLookupInput
): ApiSaveAssessmentLookupPayload {
  return {
    name: input.name.trim(),
    code: input.code.trim(),
    is_active: input.isActive ?? true,
    sort_order: input.sortOrder ?? 0,
  }
}

export function toGuarantor(raw: ApiGuarantor): Guarantor {
  return {
    id: raw.id,
    name: raw.name ?? "",
    address: raw.address ?? null,
    isActive: Boolean(raw.is_active),
    usageCount: Number(raw.usage_count ?? 0),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

export function toApiSaveGuarantorPayload(
  input: SaveGuarantorInput
): ApiSaveGuarantorPayload {
  return {
    name: input.name.trim(),
    address: input.address?.trim() ? input.address.trim() : null,
    is_active: input.isActive ?? true,
  }
}

export function toLookupOption(item: AssessmentLookup): LookupOption {
  return {
    value: item.code,
    label: item.name,
    isActive: item.isActive,
  }
}
