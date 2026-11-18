import React, { useState } from "react"
import { RecordHistoryPopover } from "@/features/audit/components/record-history-popover"
import { useQueueActionGate } from "@/features/queue"
import { useUpdatePatientBackground } from "../../hooks/use-patient-writes"
import type {
  FamilyMember,
  PatientIdCredential,
  PatientRecord,
} from "../../types"
import { PatientContactDialog } from "../dialogs/patient-contact-dialog"
import { PatientDemographicsDialog } from "../dialogs/patient-demographics-dialog"
import { PatientSocioEconomicDialog } from "../dialogs/patient-socioeconomic-dialog"
import { IdDialog, type CreateIdPayload } from "../dialogs/id-dialog"
import {
  IdPreviewDialog,
  type IdPreviewData,
} from "../dialogs/id-preview-dialog"
import { cn } from "@/lib/utils"

function formatShortBirthDate(dateStr?: string | null): string {
  if (!dateStr) return "Not recorded"
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

function isRecorded(value?: string | null): boolean {
  if (!value) return false
  const trimmed = value.trim()
  if (!trimmed) return false
  const lower = trimmed.toLowerCase()
  return (
    lower !== "n/a" &&
    lower !== "not on file" &&
    lower !== "not recorded" &&
    lower !== "none" &&
    lower !== "—"
  )
}

interface FieldBoxProps {
  label: string
  value?: string | null
  placeholder?: string
  colSpan2?: boolean
  mono?: boolean
  showAddWhenEmpty?: boolean
  onAddClick?: () => void
  canEdit?: boolean
  editDisabledReason?: string
  rightSlot?: React.ReactNode
}

const FieldBox: React.FC<FieldBoxProps> = ({
  label,
  value,
  placeholder = "Not recorded",
  colSpan2 = false,
  mono = false,
  showAddWhenEmpty = false,
  onAddClick,
  canEdit = true,
  editDisabledReason,
  rightSlot,
}) => {
  const hasValue = isRecorded(value)

  return (
    <div
      className={cn(
        "flex flex-col gap-[2px] rounded-[10px] bg-[#f4f7fc] px-[13px] py-[10px] dark:bg-muted/60",
        colSpan2 && "col-span-2"
      )}
    >
      <span className="text-[11px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center justify-between gap-[6px]">
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[13px] leading-normal",
            mono && "font-mono",
            hasValue
              ? "font-semibold text-[#1b2433] dark:text-foreground"
              : "font-medium text-[#5b6678] dark:text-muted-foreground"
          )}
        >
          {hasValue ? value : placeholder}
        </span>

        {!hasValue && showAddWhenEmpty && onAddClick && (
          <button
            type="button"
            disabled={!canEdit}
            title={!canEdit ? editDisabledReason : `Add ${label.toLowerCase()}`}
            onClick={onAddClick}
            className="flex h-[20px] shrink-0 cursor-pointer items-center rounded-full bg-[#edf3fe] px-[8px] text-[11px] leading-[20px] font-bold text-[#1f5fd6] transition-colors hover:bg-[#dce8fd] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add
          </button>
        )}

        {rightSlot}
      </div>
    </div>
  )
}

interface ProfileTabProps {
  patient: PatientRecord
  showCheckDetailsBanner?: boolean
  onDetailsChecked?: () => void
  onOpenAddFamilyDialog?: () => void
  onOpenEditFamilyDialog?: (member: FamilyMember) => void
  onDeleteFamilyMember?: (memberId: string) => void
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  patient,
  showCheckDetailsBanner = false,
  onDetailsChecked,
}) => {
  const [isEditingDemographics, setIsEditingDemographics] = useState(false)
  const [isEditingContact, setIsEditingContact] = useState(false)
  const [isEditingSocioEconomic, setIsEditingSocioEconomic] = useState(false)
  const [isAddIdOpen, setIsAddIdOpen] = useState(false)
  const [selectedPreview, setSelectedPreview] = useState<IdPreviewData | null>(
    null
  )
  const [customIds, setCustomIds] = useState<PatientIdCredential[]>(
    patient.customIds || []
  )

  const updateBackground = useUpdatePatientBackground(patient.id)
  const { canPerformActions, reason } = useQueueActionGate()

  const handleCreateId = (payload: CreateIdPayload) => {
    const newCred: PatientIdCredential = {
      id: String(Date.now()),
      idType: payload.idType,
      idNumber: payload.idNumber,
      dateIssued: payload.dateIssued,
      dateExpiry: payload.dateExpiry,
      status: payload.status || "Verified",
      isVerified: true,
    }
    setCustomIds((prev) => [newCred, ...prev])
    setIsAddIdOpen(false)
  }

  const barangayAndCity = isRecorded(patient.barangay)
    ? isRecorded(patient.city)
      ? `${patient.barangay}, ${patient.city}`
      : patient.barangay
    : isRecorded(patient.city)
      ? patient.city
      : null

  const formattedMonthlyIncome =
    patient.monthlyIncome != null
      ? `₱${patient.monthlyIncome.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : "₱0.00"

  const indigencyIssuer = isRecorded(patient.barangay)
    ? `Barangay ${patient.barangay}`
    : "Issuer not recorded"

  return (
    <>
      <div className="flex w-full flex-col gap-[16px]">
        {showCheckDetailsBanner && (
          <div
            data-node-id="I243:3787;225:5926"
            className="flex flex-wrap items-center justify-between gap-[14px] rounded-[14px] border border-[rgba(242,166,90,0.79)] bg-[#fff5e0] px-[16px] py-[14px] dark:border-amber-700/50 dark:bg-amber-950/20"
          >
            <div className="flex min-w-0 flex-1 items-center gap-[14px]">
              <span className="flex size-[40px] shrink-0 items-center justify-center rounded-[12px] bg-white shadow-xs dark:bg-card">
                <img
                  alt=""
                  className="block size-[24px] max-w-none"
                  src="/images/patient-registry/check-details-doc.svg"
                />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <span className="text-[15px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
                  Check details · 4 to confirm with the patient
                </span>
                <span className="text-[13px] leading-normal font-normal text-[#8a5300] dark:text-amber-300">
                  Contact no. and PhilHealth no. are missing; barangay and address
                  were last updated 2 years ago
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onDetailsChecked}
              data-node-id="I243:3787;225:5939"
              className="flex h-[42px] shrink-0 cursor-pointer items-center gap-[6px] rounded-full bg-[#1f5fd6] px-[18px] text-white shadow-[0px_6px_7px_rgba(31,95,214,0.25)] transition-colors hover:bg-[#1950b8]"
            >
              <img
                alt=""
                className="block size-[18px] max-w-none"
                src="/images/patient-registry/check-details-check.svg"
              />
              <div className="flex flex-col items-start justify-center leading-none text-left">
                <span className="text-[14px] leading-normal font-semibold text-white">
                  Details checked
                </span>
                <span className="text-[9px] leading-normal font-semibold text-white/70">
                  Proceed to Next Step
                </span>
              </div>
            </button>
          </div>
        )}

        <div
          data-node-id="202:2641"
          className="grid w-full grid-cols-1 gap-x-[28px] gap-y-[22px] rounded-[18px] border border-[#e4e9f2] bg-white px-[24px] pt-[21px] pb-[24px] shadow-[0px_1px_1px_rgba(12,42,91,0.04)] lg:grid-cols-2 dark:border-border dark:bg-card"
        >
        {/* 1. Personal demographics */}
        <div
          data-node-id="202:2642"
          className="flex flex-col gap-[12px] self-start"
        >
          <div className="flex w-full items-center gap-[8px]">
            <span className="flex size-[18px] shrink-0 items-center justify-center">
              <img
                alt=""
                className="block size-[18px] max-w-none"
                src="/images/patient-registry/section-demographics.svg"
              />
            </span>
            <h3 className="min-w-0 flex-1 text-[13px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
              Personal demographics
            </h3>

            <div className="[&_button]:size-[28px] [&_button]:rounded-full [&_button]:border [&_button]:border-[#cfd7e4] [&_button]:bg-white">
              <RecordHistoryPopover
                subjectType="Patient"
                subjectId={patient.id}
                label="Personal Demographics"
              />
            </div>

            <button
              type="button"
              disabled={!canPerformActions}
              title={!canPerformActions ? reason : undefined}
              onClick={() => setIsEditingDemographics(true)}
              className="flex h-[28px] shrink-0 cursor-pointer items-center gap-[4px] rounded-full border border-[#cfd7e4] bg-white px-[10px] text-[12px] leading-normal font-semibold text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] disabled:cursor-not-allowed disabled:opacity-50 dark:border-border dark:bg-card dark:text-foreground"
            >
              <img
                alt=""
                className="block size-[16px] max-w-none"
                src="/images/patient-registry/edit-pencil.svg"
              />
              <span>Edit profile</span>
            </button>
          </div>

          <div className="grid w-full grid-cols-2 gap-[10px]">
            <FieldBox label="Full name" value={patient.fullName} colSpan2 />
            <FieldBox
              label="Age / sex"
              value={`${patient.age} · ${patient.gender}`}
            />
            <FieldBox
              label="Birth date"
              value={formatShortBirthDate(patient.birthDate)}
            />
            <FieldBox
              label="Place of birth"
              value={patient.placeOfBirth}
              showAddWhenEmpty
              canEdit={canPerformActions}
              editDisabledReason={reason}
              onAddClick={() => setIsEditingDemographics(true)}
            />
            <FieldBox label="Civil status" value={patient.civilStatus} />
            <FieldBox
              label="Religion"
              value={patient.religion}
              showAddWhenEmpty
              canEdit={canPerformActions}
              editDisabledReason={reason}
              onAddClick={() => setIsEditingDemographics(true)}
            />
            <FieldBox
              label="Nationality"
              value={patient.nationality || "Filipino"}
            />
            <FieldBox
              label="Educational attainment"
              value={patient.educationalAttainment}
              colSpan2
              showAddWhenEmpty
              canEdit={canPerformActions}
              editDisabledReason={reason}
              onAddClick={() => setIsEditingDemographics(true)}
            />
          </div>
        </div>

        {/* 2. Contact & residence */}
        <div
          data-node-id="202:2713"
          className="flex flex-col gap-[12px] self-start"
        >
          <div className="flex w-full items-center gap-[8px]">
            <span className="flex size-[18px] shrink-0 items-center justify-center">
              <img
                alt=""
                className="block size-[18px] max-w-none"
                src="/images/patient-registry/section-contact.svg"
              />
            </span>
            <h3 className="min-w-0 flex-1 text-[13px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
              Contact &amp; residence
            </h3>

            <button
              type="button"
              disabled={!canPerformActions}
              title={!canPerformActions ? reason : undefined}
              onClick={() => setIsEditingContact(true)}
              className="flex h-[28px] shrink-0 cursor-pointer items-center gap-[4px] rounded-full border border-[#cfd7e4] bg-white px-[10px] text-[12px] leading-normal font-semibold text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] disabled:cursor-not-allowed disabled:opacity-50 dark:border-border dark:bg-card dark:text-foreground"
            >
              <img
                alt=""
                className="block size-[16px] max-w-none"
                src="/images/patient-registry/edit-pencil.svg"
              />
              <span>Edit</span>
            </button>
          </div>

          <div className="grid w-full grid-cols-2 gap-[10px]">
            <FieldBox
              label="Contact number"
              value={patient.contactNo}
              placeholder="N/A"
            />
            <FieldBox
              label="Barangay & city"
              value={barangayAndCity}
              showAddWhenEmpty
              canEdit={canPerformActions}
              editDisabledReason={reason}
              onAddClick={() => setIsEditingContact(true)}
            />
            <FieldBox
              label="Primary address"
              value={patient.address}
              colSpan2
              showAddWhenEmpty
              canEdit={canPerformActions}
              editDisabledReason={reason}
              onAddClick={() => setIsEditingContact(true)}
            />
            <FieldBox
              label="Present address"
              value={patient.presentAddress}
              showAddWhenEmpty
              canEdit={canPerformActions}
              editDisabledReason={reason}
              onAddClick={() => setIsEditingContact(true)}
            />
            <FieldBox
              label="Permanent address"
              value={patient.permanentAddress}
              placeholder="N/A"
            />
          </div>
        </div>

        {/* 3. Government & health IDs */}
        <div
          data-node-id="202:2760"
          className="flex flex-col gap-[12px] self-start"
        >
          <div className="flex w-full items-center gap-[8px]">
            <span className="flex size-[18px] shrink-0 items-center justify-center">
              <img
                alt=""
                className="block size-[18px] max-w-none"
                src="/images/patient-registry/section-ids.svg"
              />
            </span>
            <h3 className="min-w-0 flex-1 text-[13px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
              Government &amp; health IDs
            </h3>

            <button
              type="button"
              disabled={!canPerformActions}
              title={!canPerformActions ? reason : undefined}
              onClick={() => setIsAddIdOpen(true)}
              className="flex h-[28px] shrink-0 cursor-pointer items-center gap-[4px] rounded-full border border-[#cfd7e4] bg-white px-[10px] text-[12px] leading-normal font-semibold text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] disabled:cursor-not-allowed disabled:opacity-50 dark:border-border dark:bg-card dark:text-foreground"
            >
              <img
                alt=""
                className="block size-[16px] max-w-none"
                src="/images/patient-registry/add-plus.svg"
              />
              <span>Add new ID</span>
            </button>
          </div>

          <div className="grid w-full grid-cols-2 gap-[10px]">
            <FieldBox
              label="PhilHealth status"
              value={isRecorded(patient.philHealthNo) ? "Active" : null}
              showAddWhenEmpty
              canEdit={canPerformActions}
              editDisabledReason={reason}
              onAddClick={() => setIsAddIdOpen(true)}
            />
            <FieldBox
              label="PhilHealth no."
              value={patient.philHealthNo}
              showAddWhenEmpty
              canEdit={canPerformActions}
              editDisabledReason={reason}
              onAddClick={() => setIsAddIdOpen(true)}
            />
            <FieldBox
              label="PhilHealth program"
              value={
                isRecorded(patient.philHealthNo)
                  ? "Sponsored / Indigent"
                  : null
              }
              colSpan2
              showAddWhenEmpty
              canEdit={canPerformActions}
              editDisabledReason={reason}
              onAddClick={() => setIsAddIdOpen(true)}
            />

            {/* Barangay indigency certificate */}
            <div className="col-span-2 flex flex-col gap-[2px] rounded-[10px] bg-[#f4f7fc] px-[13px] py-[10px] dark:bg-muted/60">
              <span className="text-[11px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground">
                Barangay indigency certificate
              </span>
              <div className="flex flex-wrap items-center justify-between gap-[6px]">
                <span className="min-w-0 flex-1 truncate text-[13px] leading-normal font-semibold text-[#1b2433] dark:text-foreground">
                  {indigencyIssuer}
                </span>

                <div className="flex items-center gap-[6px]">
                  <span className="flex h-[20px] items-center rounded-full bg-[#e8f6ef] px-[8px] text-[11px] leading-[20px] font-bold text-[#146b43]">
                    Valid
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPreview({
                        idType: "Barangay Indigency Certificate",
                        idNumber: isRecorded(patient.barangay)
                          ? `IND-BRGY-${patient.barangay.toUpperCase().replace(/\s+/g, "")}`
                          : "IND-BRGY-CERT",
                        status: "Valid",
                        isVerified: true,
                      })
                    }
                    className="flex cursor-pointer items-center gap-[3px] text-[11px] leading-normal font-bold text-[#1f5fd6] hover:underline"
                  >
                    <img
                      alt=""
                      className="block size-[14px] max-w-none"
                      src="/images/patient-registry/digital-card.svg"
                    />
                    <span>View digital card</span>
                  </button>
                </div>
              </div>
            </div>

            {customIds.map((cred) => (
              <div
                key={cred.id}
                className="col-span-2 flex flex-col gap-[2px] rounded-[10px] bg-[#f4f7fc] px-[13px] py-[10px] dark:bg-muted/60"
              >
                <span className="text-[11px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground">
                  {cred.idType}
                </span>
                <div className="flex flex-wrap items-center justify-between gap-[6px]">
                  <span className="min-w-0 flex-1 truncate font-mono text-[13px] leading-normal font-semibold text-[#1b2433] dark:text-foreground">
                    {cred.idNumber}
                  </span>
                  <div className="flex items-center gap-[6px]">
                    <span className="flex h-[20px] items-center rounded-full bg-[#e8f6ef] px-[8px] text-[11px] leading-[20px] font-bold text-[#146b43]">
                      {cred.status || "Verified"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPreview({
                          idType: cred.idType,
                          idNumber: cred.idNumber,
                          status: cred.status || "Verified",
                          isVerified: true,
                          dateIssued: cred.dateIssued,
                          dateExpiry: cred.dateExpiry,
                        })
                      }
                      className="flex cursor-pointer items-center gap-[3px] text-[11px] leading-normal font-bold text-[#1f5fd6] hover:underline"
                    >
                      <img
                        alt=""
                        className="block size-[14px] max-w-none"
                        src="/images/patient-registry/digital-card.svg"
                      />
                      <span>View digital card</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Socio-economic */}
        <div
          data-node-id="202:2807"
          className="flex flex-col gap-[12px] self-start"
        >
          <div className="flex w-full items-center gap-[8px]">
            <span className="flex size-[18px] shrink-0 items-center justify-center">
              <img
                alt=""
                className="block size-[18px] max-w-none"
                src="/images/patient-registry/tab-banknotes.svg"
              />
            </span>
            <h3 className="min-w-0 flex-1 text-[13px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
              Socio-economic
            </h3>

            <button
              type="button"
              disabled={!canPerformActions}
              title={!canPerformActions ? reason : undefined}
              onClick={() => setIsEditingSocioEconomic(true)}
              className="flex h-[28px] shrink-0 cursor-pointer items-center gap-[4px] rounded-full border border-[#cfd7e4] bg-white px-[10px] text-[12px] leading-normal font-semibold text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] disabled:cursor-not-allowed disabled:opacity-50 dark:border-border dark:bg-card dark:text-foreground"
            >
              <img
                alt=""
                className="block size-[16px] max-w-none"
                src="/images/patient-registry/edit-pencil.svg"
              />
              <span>Edit</span>
            </button>
          </div>

          <div className="grid w-full grid-cols-2 gap-[10px]">
            <FieldBox
              label="Occupation"
              value={patient.occupation}
              showAddWhenEmpty
              canEdit={canPerformActions}
              editDisabledReason={reason}
              onAddClick={() => setIsEditingSocioEconomic(true)}
            />
            <FieldBox
              label="Employer"
              value={patient.employer}
              showAddWhenEmpty
              canEdit={canPerformActions}
              editDisabledReason={reason}
              onAddClick={() => setIsEditingSocioEconomic(true)}
            />
            <FieldBox
              label="Monthly income"
              value={formattedMonthlyIncome}
              colSpan2
            />
          </div>
        </div>
      </div>
    </div>

      {/* Dialogs */}
      <PatientDemographicsDialog
        isOpen={isEditingDemographics}
        onClose={() => setIsEditingDemographics(false)}
        patient={patient}
        isSaving={updateBackground.isPending}
        onSave={(payload) =>
          updateBackground.mutate(payload, {
            onSuccess: () => setIsEditingDemographics(false),
          })
        }
      />

      <PatientContactDialog
        isOpen={isEditingContact}
        onClose={() => setIsEditingContact(false)}
        patient={patient}
        isSaving={updateBackground.isPending}
        onSave={(payload) =>
          updateBackground.mutate(payload, {
            onSuccess: () => setIsEditingContact(false),
          })
        }
      />

      <PatientSocioEconomicDialog
        isOpen={isEditingSocioEconomic}
        onClose={() => setIsEditingSocioEconomic(false)}
        patient={patient}
        isSaving={updateBackground.isPending}
        onSave={(payload) =>
          updateBackground.mutate(payload, {
            onSuccess: () => setIsEditingSocioEconomic(false),
          })
        }
      />

      <IdDialog
        isOpen={isAddIdOpen}
        onClose={() => setIsAddIdOpen(false)}
        patient={patient}
        onSave={handleCreateId}
      />

      <IdPreviewDialog
        isOpen={Boolean(selectedPreview)}
        onClose={() => setSelectedPreview(null)}
        patient={patient}
        idData={selectedPreview}
      />
    </>
  )
}
