import type {
  ApiAssessmentLookup,
  ApiAssistantType,
  ApiGuarantor,
  ApiSaveAssessmentLookupPayload,
  ApiSaveAssistantTypePayload,
  ApiSaveGuarantorPayload,
  AssessmentLookup,
  AssistantType,
  Guarantor,
  LookupOption,
  SaveAssessmentLookupInput,
  SaveAssistantTypeInput,
  SaveGuarantorInput,
} from "../types"

export function toAssessmentLookup(raw: ApiAssessmentLookup): AssessmentLookup {
  return {
    id: raw.id,
    name: raw.name ?? "",
    code: raw.code ?? "",
    isActive: Boolean(raw.is_active),
    sortOrder: Number(raw.sort_order ?? 0),
    requiresSpecify: Boolean(raw.requires_specify),
    codeLocked: Boolean(raw.code_locked),
    usageCount: Number(raw.usage_count ?? 0),
    usage: raw.usage
      ? {
          assessments: raw.usage.assessments ?? 0,
          guaranteeLines: raw.usage.guarantee_lines ?? 0,
        }
      : undefined,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

export function toApiSaveAssessmentLookupPayload(
  input: SaveAssessmentLookupInput
): ApiSaveAssessmentLookupPayload {
  const payload: ApiSaveAssessmentLookupPayload = {
    name: input.name.trim(),
    code: input.code.trim(),
    is_active: input.isActive ?? true,
    sort_order: input.sortOrder ?? 0,
  }
  if (input.requiresSpecify !== undefined) {
    payload.requires_specify = input.requiresSpecify
  }
  return payload
}

export function toAssistantType(raw: ApiAssistantType): AssistantType {
  return {
    id: raw.id,
    name: raw.name ?? "",
    code: raw.code ?? "",
    category: raw.category ?? "medical",
    categoryLabel: raw.category_label || raw.category || "Medical",
    description: raw.description ?? null,
    isActive: Boolean(raw.is_active),
    usageCount: Number(raw.usage_count ?? 0),
    usage: raw.usage
      ? {
          assistanceRecords: raw.usage.assistance_records ?? 0,
          guaranteeLines: raw.usage.guarantee_lines ?? 0,
        }
      : undefined,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

export function toApiSaveAssistantTypePayload(
  input: SaveAssistantTypeInput
): ApiSaveAssistantTypePayload {
  return {
    name: input.name.trim(),
    code: input.code.trim(),
    category: input.category,
    description: input.description?.trim() ? input.description.trim() : null,
    is_active: input.isActive ?? true,
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
    id: item.id,
    value: item.code,
    label: item.name,
    isActive: item.isActive,
    requiresSpecify: item.requiresSpecify,
  }
}

export function toAssistantTypeLookupOption(item: AssistantType): LookupOption {
  return {
    id: item.id,
    value: item.code,
    label: item.name,
    isActive: item.isActive,
  }
}
