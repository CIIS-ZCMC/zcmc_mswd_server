import type {
  ApiAssistanceSource,
  ApiGuaranteeItem,
  ApiGuaranteesResponse,
  ApiGuarantorOption,
  ApiPatientGuarantee,
  ApiSaveAssistanceSourcePayload,
  ApiSaveGuaranteePayload,
  AssistanceSource,
  GuaranteeItem,
  GuaranteesResponse,
  GuarantorOption,
  PatientGuarantee,
  SaveAssistanceSourceInput,
  SaveGuaranteeInput,
} from "../types"

export function toGuaranteeItem(api: ApiGuaranteeItem): GuaranteeItem {
  return {
    id: api.id,
    sourceId: api.source?.id ?? 0,
    sourceName: api.source?.name ?? "—",
    requiresSpecify: Boolean(api.source?.requires_specify),
    othersSpecify: api.others_specify ?? "",
    amount: Number(api.amount) || 0,
  }
}

export function toPatientGuarantee(api: ApiPatientGuarantee): PatientGuarantee {
  return {
    id: api.id,
    patientId: api.patient_id,
    hisTransactionId: api.his_transaction_id,
    hospitalId: api.hospital_id,
    guarantor: api.guarantor
      ? { id: api.guarantor.id, name: api.guarantor.name }
      : null,
    referenceNo: api.reference_no ?? null,
    guaranteedOn: api.guaranteed_on ?? null,
    remarks: api.remarks ?? null,
    items: Array.isArray(api.items) ? api.items.map(toGuaranteeItem) : [],
    total: Number(api.total) || 0,
    recordedBy: api.recorded_by
      ? { id: api.recorded_by.id, name: api.recorded_by.name }
      : null,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  }
}

export function toGuaranteesResponse(
  api: ApiGuaranteesResponse
): GuaranteesResponse {
  const data = Array.isArray(api.data) ? api.data.map(toPatientGuarantee) : []
  const grandTotal =
    typeof api.grand_total === "number"
      ? api.grand_total
      : Number(api.grand_total) || data.reduce((acc, g) => acc + g.total, 0)

  return {
    data,
    grandTotal,
  }
}

export function toAssistanceSource(api: ApiAssistanceSource): AssistanceSource {
  return {
    id: api.id,
    name: api.name,
    code: api.code ?? null,
    requiresSpecify: Boolean(api.requires_specify),
    isActive: Boolean(api.is_active ?? true),
    usageCount: api.usage_count ?? 0,
  }
}

export function toApiSaveAssistanceSourcePayload(
  input: SaveAssistanceSourceInput
): ApiSaveAssistanceSourcePayload {
  return {
    name: input.name.trim(),
    code:
      input.code !== undefined &&
      input.code !== null &&
      input.code.trim() !== ""
        ? input.code.trim()
        : null,
    ...(input.requiresSpecify !== undefined
      ? { requires_specify: input.requiresSpecify }
      : {}),
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
  }
}

export function toGuarantorOption(api: ApiGuarantorOption): GuarantorOption {
  return {
    id: api.id,
    name: api.name,
    isActive: Boolean(api.is_active ?? true),
  }
}

export function toApiSaveGuaranteePayload(
  input: SaveGuaranteeInput
): ApiSaveGuaranteePayload {
  return {
    guarantor_id: input.guarantorId,
    ...(input.hisTransactionId !== undefined
      ? { his_transaction_id: input.hisTransactionId }
      : {}),
    reference_no: input.referenceNo ? input.referenceNo.trim() : null,
    guaranteed_on: input.guaranteedOn,
    remarks: input.remarks ? input.remarks.trim() : null,
    items: input.items.map((item) => ({
      assistance_source_id: item.sourceId,
      amount: Number(item.amount) || 0,
      others_specify: item.othersSpecify ? item.othersSpecify.trim() : null,
    })),
  }
}
