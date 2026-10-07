import type {
  ApiGuaranteeItem,
  ApiGuaranteesResponse,
  ApiGuarantorOption,
  ApiPatientGuarantee,
  ApiSaveGuaranteePayload,
  GuaranteeItem,
  GuaranteesResponse,
  GuarantorOption,
  PatientGuarantee,
  SaveGuaranteeInput,
} from "../types"

export function toGuaranteeItem(api: ApiGuaranteeItem): GuaranteeItem {
  return {
    id: api.id,
    assistanceTypeId: api.assistance_type?.id ?? null,
    assistanceTypeName: api.assistance_type?.name ?? null,
    amount: Number(api.amount) || 0,
    modeOfAssistanceId: api.mode_of_assistance?.id ?? null,
    modeOfAssistanceName: api.mode_of_assistance?.name ?? null,
    fundSourceId: api.fund_source?.id ?? null,
    fundSourceName: api.fund_source?.name ?? null,
    fundRequiresSpecify: Boolean(api.fund_source?.requires_specify),
    othersSpecify: api.others_specify ?? "",
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
      assistant_type_id: item.assistanceTypeId,
      amount: Number(item.amount) || 0,
      mode_of_assistance_id: item.modeOfAssistanceId,
      fund_source_id: item.fundSourceId,
      others_specify: item.othersSpecify ? item.othersSpecify.trim() : null,
    })),
  }
}
