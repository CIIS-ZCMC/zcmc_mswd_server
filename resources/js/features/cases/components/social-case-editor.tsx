import React from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { SocialCase, UpdateSocialCasePayload } from "../types"

interface SocialCaseEditorProps {
  socialCase: SocialCase
  isEditing: boolean
  formState: UpdateSocialCasePayload
  onChangeState: (updater: (prev: UpdateSocialCasePayload) => UpdateSocialCasePayload) => void
}

export const SocialCaseEditor: React.FC<SocialCaseEditorProps> = ({
  socialCase,
  isEditing,
  formState,
  onChangeState,
}) => {
  const updateField = (field: keyof UpdateSocialCasePayload, value: any) => {
    onChangeState((prev) => ({ ...prev, [field]: value }))
  }

  const narrativeFields: Array<{
    key: keyof UpdateSocialCasePayload
    title: string
    readOnlyVal: string | null
    placeholder: string
    rows?: number
  }> = [
    {
      key: "presenting_problem",
      title: "I. Presenting Problem & Source of Referral",
      readOnlyVal: socialCase.presentingProblem,
      placeholder: "Describe the patient's immediate problem, referral source, and reasons for requesting social work assistance...",
      rows: 3,
    },
    {
      key: "family_background",
      title: "II. Family Composition & Background",
      readOnlyVal: socialCase.familyBackground,
      placeholder: "Detail family structure, support system, dynamics, and living arrangements...",
      rows: 3,
    },
    {
      key: "social_functioning",
      title: "III. Environmental & Social Functioning",
      readOnlyVal: socialCase.socialFunctioning,
      placeholder: "Describe social interactions, community participation, and adaptive coping mechanisms...",
      rows: 3,
    },
    {
      key: "assessment_notes",
      title: "IV. Social Worker Evaluation & Assessment Notes",
      readOnlyVal: socialCase.assessmentNotes,
      placeholder: "Provide comprehensive social worker evaluation and professional assessment findings...",
      rows: 4,
    },
    {
      key: "intervention_plan",
      title: "V. Treatment & Intervention Plan",
      readOnlyVal: socialCase.interventionPlan,
      placeholder: "Outline social work interventions, financial assistance goals, and counseling schedule...",
      rows: 3,
    },
    {
      key: "environmental_factors",
      title: "VI. Environmental & Neighborhood Factors",
      readOnlyVal: socialCase.environmentalFactors,
      placeholder: "Notes on community safety, sanitation, access to water/electricity, and neighborhood conditions...",
      rows: 2,
    },
    {
      key: "economic_status_notes",
      title: "VII. Economic Status & Financial Capacity",
      readOnlyVal: socialCase.economicStatusNotes,
      placeholder: "Detailed breakdown of family livelihood, debt burdens, and financial distress factors...",
      rows: 2,
    },
    {
      key: "health_condition_notes",
      title: "VIII. Health Condition & Medical History Summary",
      readOnlyVal: socialCase.healthConditionNotes,
      placeholder: "Summary of clinical diagnosis, treatment duration, and medical care requirements...",
      rows: 2,
    },
    {
      key: "psycho_social_evaluation",
      title: "IX. Psycho-Social Evaluation & Coping Assessment",
      readOnlyVal: socialCase.psychoSocialEvaluation,
      placeholder: "Assessment of psychological resilience, emotional stress, and caregiver burden...",
      rows: 2,
    },
    {
      key: "recommendations",
      title: "X. Final Recommendations & Disposition",
      readOnlyVal: socialCase.recommendations,
      placeholder: "Formal recommendation to section head regarding classification and assistance approval...",
      rows: 3,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Socioeconomic & Classification Summary */}
      <Card className="border border-border/80 shadow-sm bg-card">
        <CardHeader className="py-3.5 px-5 border-b border-border/60 bg-muted/30">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
            Socioeconomic Classification Basis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sc-classification" className="text-xs font-semibold">
                  Classification Category
                </Label>
                <Select
                  value={formState.classification ?? socialCase.classification}
                  onValueChange={(val) => updateField("classification", val)}
                >
                  <SelectTrigger id="sc-classification" className="h-9 text-xs">
                    <SelectValue placeholder="Select classification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Indigent">Indigent (C3 / D)</SelectItem>
                    <SelectItem value="Low Income">Low Income (C1 / C2)</SelectItem>
                    <SelectItem value="Self-Sufficient">Self-Sufficient</SelectItem>
                    <SelectItem value="Others">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sc-family-income" className="text-xs font-semibold">
                  Monthly Family Income (₱)
                </Label>
                <Input
                  id="sc-family-income"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formState.total_family_income ?? (socialCase.totalFamilyIncome ?? "")}
                  onChange={(e) => updateField("total_family_income", e.target.value ? Number(e.target.value) : undefined)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sc-housing-type" className="text-xs font-semibold">
                  Housing Type
                </Label>
                <Input
                  id="sc-housing-type"
                  placeholder="e.g. Owned, Rented, Informal Settler"
                  value={formState.housing_type ?? (socialCase.housingType ?? "")}
                  onChange={(e) => updateField("housing_type", e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sc-utilities" className="text-xs font-semibold">
                  Utilities Access
                </Label>
                <Input
                  id="sc-utilities"
                  placeholder="e.g. Water & Electricity"
                  value={formState.utilities_access ?? (socialCase.utilitiesAccess ?? "")}
                  onChange={(e) => updateField("utilities_access", e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="font-semibold text-muted-foreground block mb-0.5">Category</span>
                <span className="font-bold text-foreground">{socialCase.classification}</span>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground block mb-0.5">Monthly Family Income</span>
                <span className="font-bold text-foreground">
                  {socialCase.totalFamilyIncome != null ? `₱${socialCase.totalFamilyIncome.toLocaleString()}` : "Not recorded"}
                </span>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground block mb-0.5">Housing Type</span>
                <span className="font-medium text-foreground">{socialCase.housingType || "Not recorded"}</span>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground block mb-0.5">Utilities Access</span>
                <span className="font-medium text-foreground">{socialCase.utilitiesAccess || "Not recorded"}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ten Narrative Sections */}
      <div className="space-y-5">
        {narrativeFields.map((field) => {
          const currentVal = (formState[field.key] as string) ?? (field.readOnlyVal || "")

          return (
            <div key={field.key} className="space-y-1.5">
              <span className="font-bold text-sm text-foreground block">
                {field.title}
              </span>
              {isEditing ? (
                <Textarea
                  value={currentVal}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={field.rows ?? 3}
                  className="text-sm leading-relaxed"
                />
              ) : (
                <p className="rounded-xl bg-muted/40 p-3.5 text-sm text-foreground leading-relaxed border border-border/60 min-h-[60px] whitespace-pre-wrap">
                  {field.readOnlyVal || <span className="text-muted-foreground italic">No details recorded for this section.</span>}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Expenses Grid (Read-Only per Plan §Out of Scope) */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="py-3.5 px-5 border-b border-border/60 bg-muted/30">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
            Family Monthly Expenses Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {socialCase.expenses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="w-[60%]">Expense Type</TableHead>
                  <TableHead className="text-right">Monthly Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {socialCase.expenses.map((exp) => (
                  <TableRow key={exp.id} className="text-xs">
                    <TableCell className="font-medium">{exp.expenseType}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      ₱{exp.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30 text-xs font-bold">
                  <TableCell>Total Monthly Family Expenses</TableCell>
                  <TableCell className="text-right font-mono text-primary text-sm font-bold">
                    ₱{socialCase.expensesTotal.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <div className="p-4 text-xs text-muted-foreground text-center">
              No itemized household expenses recorded on file.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommended Assistance & Approved Amount */}
      <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 flex-1">
          <span className="font-bold text-sm text-foreground block">
            Recommended Assistance & Disposition:
          </span>
          {isEditing ? (
            <Input
              value={(formState.recommended_assistance as string) ?? (socialCase.recommendedAssistance || "")}
              onChange={(e) => updateField("recommended_assistance", e.target.value)}
              placeholder="e.g. Medical Assistance for Indigent Patients (MAIFIP) grant..."
              className="h-9 text-xs bg-background"
            />
          ) : (
            <p className="text-xs text-muted-foreground font-medium">
              {socialCase.recommendedAssistance || "No recommendation specified yet."}
            </p>
          )}
        </div>

        <div className="sm:text-right shrink-0">
          <span className="text-xs font-semibold text-muted-foreground block mb-0.5">
            Recommended / Approved Amount:
          </span>
          {isEditing ? (
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formState.recommended_amount ?? (socialCase.recommendedAmount ?? "")}
              onChange={(e) => updateField("recommended_amount", e.target.value ? Number(e.target.value) : undefined)}
              placeholder="0.00"
              className="h-9 w-36 text-xs text-right font-mono bg-background"
            />
          ) : (
            <span className="font-mono text-xl font-extrabold text-primary">
              ₱{socialCase.recommendedAmount != null ? socialCase.recommendedAmount.toLocaleString() : "0"}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
