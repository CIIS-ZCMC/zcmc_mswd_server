import React, { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { ApiError } from "@/lib/api-client"
import {
  useCreateAssessment,
  useUpdateAssessment,
} from "../../hooks/use-assessment"
import type {
  Assessment,
  CreateAssessmentPayload,
  UpdateAssessmentPayload,
} from "../../types/assessment.types"
import {
  INFORMANT_RELATIONSHIP_OPTIONS,
  LEGACY_CLASSIFICATION_OPTIONS,
  MSWD_CLASSIFICATION_OPTIONS,
  PROBLEM_CATEGORY_OPTIONS,
  selectableOptions,
} from "../../lib/assessment-constants"
import {
  useFundSourceOptions,
  useModeOfAssistanceOptions,
} from "@/features/library/hooks/use-lookup-options"
import {
  AlertCircle,
  FileCheck,
  FileEdit,
  HeartHandshake,
  Loader2,
  Stethoscope,
  User,
  UserCheck,
} from "lucide-react"

interface IntakeAssessmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  caseId: number
  caseCode?: string
  patientName?: string
  patientFirstName?: string
  patientMiddleName?: string
  patientLastName?: string
  patientAddress?: string
  patientContact?: string
  patientMonthlyIncome?: number | null
  existingAssessment?: Assessment | null
  onSuccess?: () => void
}

function parseFullName(raw: string): { last: string; first: string; middle: string } {
  if (!raw) return { last: "", first: "", middle: "" }
  const trimmed = raw.trim()
  if (trimmed.includes(",")) {
    const [lastPart, restPart] = trimmed.split(",")
    const rest = (restPart || "").trim().split(/\s+/)
    return {
      last: lastPart.trim(),
      first: rest[0] || "",
      middle: rest.slice(1).join(" "),
    }
  }
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) {
    return { last: "", first: parts[0], middle: "" }
  }
  if (parts.length === 2) {
    return { first: parts[0], middle: "", last: parts[1] }
  }
  return {
    first: parts[0],
    middle: parts.slice(1, -1).join(" "),
    last: parts[parts.length - 1],
  }
}

function combineInformantName(last: string, first: string, middle: string): string | null {
  const l = last.trim()
  const f = first.trim()
  const m = middle.trim()
  if (!l && !f && !m) return null
  if (l && f) {
    return `${l}, ${f}${m ? ` ${m}` : ""}`.trim()
  }
  return [f, m, l].filter(Boolean).join(" ").trim() || null
}

export const IntakeAssessmentDialog: React.FC<IntakeAssessmentDialogProps> = ({
  open,
  onOpenChange,
  caseId,
  caseCode,
  patientName,
  patientFirstName,
  patientMiddleName,
  patientLastName,
  patientAddress,
  patientContact,
  existingAssessment,
  onSuccess,
}) => {
  const isEditMode = Boolean(existingAssessment?.id)
  const assessmentId = existingAssessment?.id ?? 0

  const createMutation = useCreateAssessment(caseId)
  const updateMutation = useUpdateAssessment(caseId, assessmentId)

  // Library options; the inactive ones are fetched too so a retired value keeps its name.
  const { data: modeOptionsData = [] } = useModeOfAssistanceOptions(false)
  const { data: fundSourceOptionsData = [] } = useFundSourceOptions(false)

  // Form State: Informant Details
  const [isInformantPatient, setIsInformantPatient] = useState(false)
  const [informantLastName, setInformantLastName] = useState("")
  const [informantFirstName, setInformantFirstName] = useState("")
  const [informantMiddleName, setInformantMiddleName] = useState("")
  const [informantRelationship, setInformantRelationship] = useState("")
  const [customRelationship, setCustomRelationship] = useState("")
  const [informantAddress, setInformantAddress] = useState("")
  const [informantContact, setInformantContact] = useState("")

  // Problem & Medical
  const [presentingProblem, setPresentingProblem] = useState("")
  const [problemCategories, setProblemCategories] = useState<string[]>([])
  const [problemSpecify, setProblemSpecify] = useState("")
  const [medicalHistory, setMedicalHistory] = useState("")

  // Recommendations & Classification
  const [recommendation, setRecommendation] = useState("")
  const [recommendationMode, setRecommendationMode] = useState("")
  const [fundSource, setFundSource] = useState("")
  const [hasOverride, setHasOverride] = useState(false)
  const [classificationOverride, setClassificationOverride] = useState<string>("")
  const [overrideReason, setOverrideReason] = useState("")

  const [familyBackground, setFamilyBackground] = useState("")
  const [socialFunctioning, setSocialFunctioning] = useState("")
  const [assessmentNotes, setAssessmentNotes] = useState("")
  const [interventionPlan, setInterventionPlan] = useState("")

  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Initialize form from existing assessment on open
  useEffect(() => {
    if (open) {
      setErrorMsg(null)
      if (existingAssessment) {
        if (
          existingAssessment.informantLastName ||
          existingAssessment.informantFirstName ||
          existingAssessment.informantMiddleName
        ) {
          setInformantLastName(existingAssessment.informantLastName ?? "")
          setInformantFirstName(existingAssessment.informantFirstName ?? "")
          setInformantMiddleName(existingAssessment.informantMiddleName ?? "")
        } else if (existingAssessment.informantName) {
          const parsed = parseFullName(existingAssessment.informantName)
          setInformantLastName(parsed.last)
          setInformantFirstName(parsed.first)
          setInformantMiddleName(parsed.middle)
        } else {
          setInformantLastName("")
          setInformantFirstName("")
          setInformantMiddleName("")
        }

        const rawRel = existingAssessment.informantRelationship?.trim() || ""
        const standardMatch = INFORMANT_RELATIONSHIP_OPTIONS.find(
          (opt) =>
            opt.value.toLowerCase() === rawRel.toLowerCase() ||
            (opt.value === "Patient" && rawRel.toLowerCase() === "self")
        )
        if (standardMatch) {
          setInformantRelationship(standardMatch.value)
          setCustomRelationship("")
        } else if (rawRel) {
          setInformantRelationship("Other")
          setCustomRelationship(rawRel)
        } else {
          setInformantRelationship("")
          setCustomRelationship("")
        }

        setInformantAddress(existingAssessment.informantAddress ?? "")
        setInformantContact(existingAssessment.informantContact ?? "")
        setIsInformantPatient(
          (existingAssessment.informantRelationship?.toLowerCase() === "patient" ||
            existingAssessment.informantRelationship?.toLowerCase() === "self") &&
          Boolean(patientName && existingAssessment.informantName === patientName)
        )
        setPresentingProblem(existingAssessment.presentingProblem ?? "")
        setProblemCategories(existingAssessment.problemCategories ?? [])
        setProblemSpecify(existingAssessment.problemSpecify ?? "")
        setMedicalHistory(existingAssessment.medicalHistory ?? "")

        setRecommendation(existingAssessment.recommendation ?? "")
        setRecommendationMode(existingAssessment.recommendationMode ?? "")
        setFundSource(existingAssessment.fundSource ?? "")
        setHasOverride(existingAssessment.hasOverride ?? false)
        setClassificationOverride(
          (existingAssessment.classification as string) ||
          (existingAssessment.calculatedClassification as string) ||
          ""
        )
        setOverrideReason(existingAssessment.classificationOverrideReason ?? "")
        setFamilyBackground(existingAssessment.familyBackground ?? "")
        setSocialFunctioning(existingAssessment.socialFunctioning ?? "")
        setAssessmentNotes(existingAssessment.assessmentNotes ?? "")
        setInterventionPlan(existingAssessment.interventionPlan ?? "")
      } else {
        setIsInformantPatient(false)
        setInformantLastName("")
        setInformantFirstName("")
        setInformantMiddleName("")
        setInformantRelationship("")
        setCustomRelationship("")
        setInformantAddress("")
        setInformantContact("")
        setPresentingProblem("")
        setProblemCategories([])
        setProblemSpecify("")
        setMedicalHistory("")
        setRecommendation("")
        setRecommendationMode("")
        setFundSource("")
        setHasOverride(false)
        setClassificationOverride("")
        setOverrideReason("")
        setFamilyBackground("")
        setSocialFunctioning("")
        setAssessmentNotes("")
        setInterventionPlan("")
      }
    }
  }, [open, existingAssessment, patientName, patientAddress, patientContact])

  // Handle "Informant is Patient" toggle
  const handleToggleInformantIsPatient = (checked: boolean) => {
    setIsInformantPatient(checked)
    if (checked) {
      if (patientLastName || patientFirstName || patientMiddleName) {
        setInformantLastName(patientLastName || "")
        setInformantFirstName(patientFirstName || "")
        setInformantMiddleName(patientMiddleName || "")
      } else if (patientName) {
        const parsed = parseFullName(patientName)
        setInformantLastName(parsed.last)
        setInformantFirstName(parsed.first)
        setInformantMiddleName(parsed.middle)
      }
      setInformantRelationship("Patient")
      setCustomRelationship("")
      if (patientAddress) setInformantAddress(patientAddress)
      if (patientContact) setInformantContact(patientContact)
    } else {
      setInformantLastName("")
      setInformantFirstName("")
      setInformantMiddleName("")
      setInformantRelationship("")
      setCustomRelationship("")
      setInformantAddress("")
      setInformantContact("")
    }
  }

  const toggleCategory = (cat: string) => {
    setProblemCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (hasOverride && !overrideReason.trim()) {
      setErrorMsg("Written justification is required when overriding MSWD classification.")
      return
    }

    const combinedName = combineInformantName(informantLastName, informantFirstName, informantMiddleName)

    const effectiveRelationship =
      informantRelationship === "Other"
        ? customRelationship.trim() || "Other"
        : informantRelationship.trim() || null

    if (isEditMode) {
      const payload: UpdateAssessmentPayload = {
        informant_name: combinedName,
        informant_last_name: informantLastName.trim() || null,
        informant_first_name: informantFirstName.trim() || null,
        informant_middle_name: informantMiddleName.trim() || null,
        informant_relationship: effectiveRelationship,
        informant_address: informantAddress.trim() || null,
        informant_contact_number: informantContact.trim() || null,
        informant_contact: informantContact.trim() || null,
        presenting_problem: presentingProblem.trim() || null,
        problem_categories: problemCategories.length > 0 ? problemCategories : null,
        problem_specify: problemSpecify.trim() || null,
        medical_history: medicalHistory.trim() || null,
        recommendation: recommendation.trim() || null,
        recommendation_mode: recommendationMode || null,
        fund_source: fundSource || null,
        classification: hasOverride && classificationOverride ? classificationOverride : null,
        classification_override_reason: hasOverride ? overrideReason.trim() : null,
        family_background: familyBackground.trim() || null,
        social_functioning: socialFunctioning.trim() || null,
        assessment_notes: assessmentNotes.trim() || null,
        intervention_plan: interventionPlan.trim() || null,
      }

      try {
        await updateMutation.mutateAsync(payload)
        onOpenChange(false)
        onSuccess?.()
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setErrorMsg(err.firstValidationMessage || err.message)
        } else {
          setErrorMsg(err instanceof Error ? err.message : "Failed to update assessment.")
        }
      }
    } else {
      const payload: CreateAssessmentPayload = {
        informant_name: combinedName,
        informant_last_name: informantLastName.trim() || null,
        informant_first_name: informantFirstName.trim() || null,
        informant_middle_name: informantMiddleName.trim() || null,
        informant_relationship: effectiveRelationship,
        informant_address: informantAddress.trim() || null,
        informant_contact_number: informantContact.trim() || null,
        informant_contact: informantContact.trim() || null,
        presenting_problem: presentingProblem.trim() || null,
        problem_categories: problemCategories.length > 0 ? problemCategories : null,
        problem_specify: problemSpecify.trim() || null,
        medical_history: medicalHistory.trim() || null,
        recommendation: recommendation.trim() || null,
        recommendation_mode: recommendationMode || null,
        fund_source: fundSource || null,
        classification: hasOverride && classificationOverride ? classificationOverride : null,
        classification_override_reason: hasOverride ? overrideReason.trim() : null,
        family_background: familyBackground.trim() || null,
        social_functioning: socialFunctioning.trim() || null,
        assessment_notes: assessmentNotes.trim() || null,
        intervention_plan: interventionPlan.trim() || null,
      }

      try {
        await createMutation.mutateAsync(payload)
        onOpenChange(false)
        onSuccess?.()
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setErrorMsg(err.firstValidationMessage || err.message)
        } else {
          setErrorMsg(err instanceof Error ? err.message : "Failed to create assessment.")
        }
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-6 sm:p-8">
        <DialogHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl sm:text-2xl font-extrabold flex items-center gap-2.5 text-foreground">
                {isEditMode ? (
                  <FileEdit className="size-6 text-primary" />
                ) : (
                  <FileCheck className="size-6 text-primary" />
                )}
                {isEditMode ? "Edit Intake Assessment (ANNEX B)" : "New Intake Assessment (ANNEX B)"}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground font-medium">
                Unified Intake Assessment and MSWD Classification Form for Case #{caseCode ?? caseId}
                {patientName ? ` (${patientName})` : ""}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {errorMsg && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-4 flex gap-3 items-start text-xs sm:text-sm font-semibold text-destructive">
              <AlertCircle className="size-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">Validation / Server Error</div>
                <div>{errorMsg}</div>
              </div>
            </div>
          )}

          {/* Section 1: Informant Details */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <User className="size-5 text-primary" />
                <h4 className="text-base sm:text-lg font-bold text-foreground">
                  1. Informant Details
                </h4>
              </div>

              {/* Informant is the Patient toggle */}
              <label className="inline-flex items-center gap-2.5 bg-primary/10 hover:bg-primary/15 border border-primary/30 px-3.5 py-1.5 rounded-xl cursor-pointer select-none transition-all">
                <Checkbox
                  checked={isInformantPatient}
                  onCheckedChange={(checked) => handleToggleInformantIsPatient(Boolean(checked))}
                />
                <span className="text-xs font-extrabold text-primary flex items-center gap-1.5">
                  <UserCheck className="size-3.5" />
                  Informant is the Patient
                </span>
              </label>
            </div>

            {/* Three Name Inputs: Last Name, First Name, Middle Name */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider">Informant Last Name</Label>
                <Input
                  placeholder="e.g. Santos"
                  value={informantLastName}
                  onChange={(e) => setInformantLastName(e.target.value)}
                  disabled={isInformantPatient}
                  className="h-11 text-sm font-medium disabled:opacity-75 disabled:bg-muted/40 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider">Informant First Name</Label>
                <Input
                  placeholder="e.g. Maria"
                  value={informantFirstName}
                  onChange={(e) => setInformantFirstName(e.target.value)}
                  disabled={isInformantPatient}
                  className="h-11 text-sm font-medium disabled:opacity-75 disabled:bg-muted/40 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider">Informant Middle Name</Label>
                <Input
                  placeholder="e.g. Dela Cruz"
                  value={informantMiddleName}
                  onChange={(e) => setInformantMiddleName(e.target.value)}
                  disabled={isInformantPatient}
                  className="h-11 text-sm font-medium disabled:opacity-75 disabled:bg-muted/40 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Relationship to Patient & Contact Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider">Relationship to Patient</Label>
                <Select
                  value={informantRelationship}
                  onValueChange={(val) => {
                    const nextVal = val ?? ""
                    setInformantRelationship(nextVal)
                    if (nextVal !== "Other") {
                      setCustomRelationship("")
                    }
                  }}
                  disabled={isInformantPatient}
                >
                  <SelectTrigger className="h-11 text-sm font-medium disabled:opacity-75 disabled:bg-muted/40 disabled:cursor-not-allowed">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {INFORMANT_RELATIONSHIP_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider">Informant Contact Number</Label>
                <Input
                  placeholder="e.g. 0917-123-4567"
                  value={informantContact}
                  onChange={(e) => setInformantContact(e.target.value)}
                  disabled={isInformantPatient}
                  className="h-11 text-sm font-medium disabled:opacity-75 disabled:bg-muted/40 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Specify Relationship if "Other" is selected */}
            {informantRelationship === "Other" && (
              <div className="space-y-1.5 animate-in fade-in-50 duration-200">
                <Label className="text-xs font-bold uppercase tracking-wider text-primary">
                  Specify Relationship <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g. Landlord, Neighbor, Social Worker, Co-worker"
                  value={customRelationship}
                  onChange={(e) => setCustomRelationship(e.target.value)}
                  disabled={isInformantPatient}
                  className="h-11 text-sm font-medium"
                  autoFocus
                />
              </div>
            )}

            {/* Informant Address */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">Informant Address</Label>
              <Input
                placeholder="e.g. House No., Street, Barangay, City/Municipality"
                value={informantAddress}
                onChange={(e) => setInformantAddress(e.target.value)}
                disabled={isInformantPatient}
                className="h-11 text-sm font-medium disabled:opacity-75 disabled:bg-muted/40 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Section 2: Presenting Problem & Medical Needs (Renumbered from 4) */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <Stethoscope className="size-5 text-primary" />
              <h4 className="text-base sm:text-lg font-bold text-foreground">
                2. Presenting Problem &amp; Medical History
              </h4>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">Presenting Problem</Label>
              <Textarea
                placeholder="State the primary medical, financial, or psychosocial difficulties presented by the client..."
                value={presentingProblem}
                onChange={(e) => setPresentingProblem(e.target.value)}
                rows={2}
                className="text-sm font-medium resize-y"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider">Problem Categories</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {PROBLEM_CATEGORY_OPTIONS.map((cat) => {
                  const checked = problemCategories.includes(cat.value)
                  return (
                    <label
                      key={cat.value}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs sm:text-sm font-semibold cursor-pointer select-none transition-all ${checked
                          ? "bg-primary/10 border-primary text-primary shadow-2xs"
                          : "bg-muted/20 border-border/60 text-muted-foreground hover:bg-muted/40"
                        }`}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleCategory(cat.value)} />
                      <span>{cat.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider">Specify Problem Details</Label>
                <Input
                  placeholder="e.g. Inability to purchase required orthopedic implants"
                  value={problemSpecify}
                  onChange={(e) => setProblemSpecify(e.target.value)}
                  className="h-11 text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider">Medical History / Diagnosis Summary</Label>
                <Input
                  placeholder="e.g. Hypertension, CKD Stage 5 on HD"
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  className="h-11 text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Recommendations & Classification (Renumbered from 5) */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <HeartHandshake className="size-5 text-primary" />
              <h4 className="text-base sm:text-lg font-bold text-foreground">
                3. Recommendation &amp; MSWD Classification
              </h4>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">Social Worker Recommendation</Label>
              <Textarea
                placeholder="Specific recommendations, assistance modes, or counseling plan..."
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                rows={2}
                className="text-sm font-medium resize-y"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider">Mode of Assistance</Label>
                <Select value={recommendationMode} onValueChange={(val) => setRecommendationMode(val ?? "")}>
                  <SelectTrigger className="h-11 text-sm font-medium">
                    <SelectValue placeholder="Select Recommendation Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableOptions(modeOptionsData, recommendationMode).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-sm py-2">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider">Fund Source</Label>
                <Select value={fundSource} onValueChange={(val) => setFundSource(val ?? "")}>
                  <SelectTrigger className="h-11 text-sm font-medium">
                    <SelectValue placeholder="Select Fund Source" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableOptions(fundSourceOptionsData, fundSource).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-sm py-2">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Classification Override Toggle */}
            <div className="rounded-xl border border-border/60 p-4 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold text-foreground">Manual Classification Override</Label>
                  <p className="text-xs text-muted-foreground">
                    By default, the server calculates classification from per-capita net income. Enable this to manually set a specific tier.
                  </p>
                </div>
                <Switch checked={hasOverride} onCheckedChange={setHasOverride} />
              </div>

              {hasOverride && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider">Selected Tier</Label>
                    <Select value={classificationOverride} onValueChange={(val) => setClassificationOverride(val ?? "")}>
                      <SelectTrigger className="h-11 text-sm font-bold">
                        <SelectValue placeholder="Select MSWD Tier" />
                      </SelectTrigger>
                      <SelectContent>
                        {MSWD_CLASSIFICATION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-sm font-bold py-2">
                            {opt.label}
                          </SelectItem>
                        ))}
                        {LEGACY_CLASSIFICATION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-sm font-semibold py-2">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider">Override Justification *</Label>
                    <Input
                      placeholder="Mandatory justification for manual classification override"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="h-11 text-sm font-medium"
                      required={hasOverride}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-4 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="font-bold text-sm h-11 px-5 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="font-extrabold text-sm h-11 px-8 gap-2 shadow-sm cursor-pointer"
            >
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              {isEditMode ? "Update Assessment" : "Save Assessment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
