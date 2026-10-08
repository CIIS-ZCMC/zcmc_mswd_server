import { openPdfInNewTab } from "@/lib/open-pdf"
import type { PatientGuarantee } from "../types"

/**
 * Whether a guarantee is DOH-MAIFIP, the only guarantor whose guarantees print
 * the Acknowledgement Slip. Mirrors App\Models\Guarantor::isMaifip() (name match:
 * guarantors have no code).
 */
export function isMaifipGuarantee(guarantee: PatientGuarantee): boolean {
  return (guarantee.guarantor?.name ?? "").toUpperCase().includes("MAIFIP")
}

/** The slip's "para sa": the breakdown's types of assistance, e.g. LABORATORY/X-RAY. */
export function slipPurpose(guarantee: PatientGuarantee): string {
  const names = guarantee.items
    .map((item) => item.assistanceTypeName)
    .filter((name): name is string => Boolean(name))

  return [...new Set(names)].join("/").toUpperCase()
}

export interface AcknowledgementSlipOptions {
  remarks?: string
  timeStarted?: string
  timeEnded?: string
  preview?: boolean
  /** HIS source only: the "para sa" types (Library ids), in the order picked. */
  assistantTypeIds?: number[]
}

/** Open GET /api/guarantees/{id}/acknowledgement-slip/pdf in a new tab. */
export function openAcknowledgementSlip(
  guaranteeId: number,
  options: AcknowledgementSlipOptions = {}
): Promise<void> {
  return openPdfInNewTab(
    `/guarantees/${guaranteeId}/acknowledgement-slip/pdf`,
    {
      remarks: options.remarks?.trim() || undefined,
      time_started: options.timeStarted || undefined,
      time_ended: options.timeEnded || undefined,
      preview: options.preview ? 1 : undefined,
    }
  )
}

/**
 * Open GET /api/patient-transactions/{id}/acknowledgement-slip/pdf: the slip from
 * the encounter's MAIFIP entry on the HIS guarantor ledger (`entry` = PK_TRXNO).
 */
export function openHisAcknowledgementSlip(
  transactionId: number | string,
  entryId: number,
  options: AcknowledgementSlipOptions = {}
): Promise<void> {
  return openPdfInNewTab(
    `/patient-transactions/${transactionId}/acknowledgement-slip/pdf`,
    {
      entry: entryId,
      assistant_type_ids: options.assistantTypeIds?.length
        ? options.assistantTypeIds.join(",")
        : undefined,
      remarks: options.remarks?.trim() || undefined,
      time_started: options.timeStarted || undefined,
      time_ended: options.timeEnded || undefined,
      preview: options.preview ? 1 : undefined,
    }
  )
}

/** Whether a HIS ledger guarantor name is MAIFIP (mirrors the server's match). */
export function isMaifipName(name: string | null | undefined): boolean {
  return (name ?? "").toUpperCase().includes("MAIFIP")
}
