import React, { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useMswdClassificationMatrix, useReassessCase } from "../../hooks/use-assessment"
import type { Assessment, MswdClassificationCode, ReassessmentPayload } from "../../types/assessment.types"
import { formatCurrency, getBracketColor } from "../../lib/classification"
import { AlertCircle, Calculator, Loader2, Plus, Trash2 } from "lucide-react"
import { ApiError } from "@/lib/api-client"

interface ReassessCaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  caseId: number
  latestAssessment?: Assessment | null
  onSuccess?: () => void
}

const REASSESSMENT_REASONS = [
  "Income Change",
  "Re-admission",
  "Prolonged Hospitalization",
  "Annual Review",
  "Assistance Request",
  "Change in Household Composition",
  "Medical Emergency",
  "Other",
]

export const ReassessCaseDialog: React.FC<ReassessCaseDialogProps> = ({
  open,
  onOpenChange,
  caseId,
  latestAssessment,
  onSuccess,
}) => {
  const { data: matrix = [] } = useMswdClassificationMatrix()
  const reassessMutation = useReassessCase(caseId)

  // Form states initialized with latest assessment baseline
  const [reassessmentReason, setReassessmentReason] = useState<string>("Income Change")
  const [totalIncome, setTotalIncome] = useState<string>(
    latestAssessment?.totalFamilyIncome !== null && latestAssessment?.totalFamilyIncome !== undefined
      ? String(latestAssessment.totalFamilyIncome)
      : "0"
  )
  const [householdSize, setHouseholdSize] = useState<string>(
    latestAssessment?.householdSize ? String(latestAssessment.householdSize) : "1"
  )
  const [expenses, setExpenses] = useState<Array<{ expense_type: string; amount: string }>>(
    latestAssessment?.expenses?.map((e) => ({
      expense_type: e.expenseType,
      amount: String(e.amount),
    })) || [
      { expense_type: "Food & Household", amount: "0" },
      { expense_type: "Utilities & Rent", amount: "0" },
    ]
  )

  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Calculation Math
  const parsedIncome = useMemo(() => Math.max(0, Number(totalIncome) || 0), [totalIncome])
  const parsedHouseholdSize = useMemo(() => Math.max(1, Number(householdSize) || 1), [householdSize])
  const parsedExpensesTotal = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
  }, [expenses])

  const calculatedNetPerCapita = useMemo(() => {
    const net = (parsedIncome - parsedExpensesTotal) / parsedHouseholdSize
    return Math.max(0, net)
  }, [parsedIncome, parsedExpensesTotal, parsedHouseholdSize])

  // Determine matrix calculated bracket preview
  const calculatedBracket = useMemo<MswdClassificationCode>(() => {
    if (!matrix || matrix.length === 0) return "D"
    // Match matrix tiers sorted by minPerCapitaIncome ascending or matching bounds
    const matchedTier = matrix.find((tier) => {
      const min = tier.minPerCapitaIncome ?? 0
      const max = tier.maxPerCapitaIncome
      if (max === null) {
        return calculatedNetPerCapita >= min
      }
      return calculatedNetPerCapita >= min && calculatedNetPerCapita <= max
    })
    return matchedTier ? matchedTier.code : "D"
  }, [matrix, calculatedNetPerCapita])

  const finalClassification = calculatedBracket

  const handleAddExpense = () => {
    setExpenses((prev) => [...prev, { expense_type: "", amount: "0" }])
  }

  const handleRemoveExpense = (index: number) => {
    setExpenses((prev) => prev.filter((_, i) => i !== index))
  }

  const handleExpenseChange = (index: number, field: "expense_type" | "amount", value: string) => {
    setExpenses((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!reassessmentReason) {
      setErrorMsg("Please select or enter a reassessment reason.")
      return
    }

    const payload: ReassessmentPayload = {
      reassessment_reason: reassessmentReason,
      total_family_income: parsedIncome,
      household_size: parsedHouseholdSize,
      expenses: expenses
        .filter((e) => e.expense_type.trim() && Number(e.amount) >= 0)
        .map((e) => ({ expense_type: e.expense_type, amount: Number(e.amount) || 0 })),
    }

    try {
      await reassessMutation.mutateAsync(payload)
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMsg(err.firstValidationMessage || err.message)
      } else {
        setErrorMsg(err instanceof Error ? err.message : "Failed to submit re-assessment.")
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Issue Patient Episode Re-Assessment
          </DialogTitle>
          <DialogDescription className="text-xs">
            Submit an append-only re-assessment to recalculate Net Per Capita Income, MSWD bracket classification, and discount rates for this episode.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2 text-xs">
          {errorMsg && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertTitle>Submission Error</AlertTitle>
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          {/* Reassessment Reason */}
          <div className="space-y-1.5">
            <Label className="font-bold text-xs">Re-Assessment Reason *</Label>
            <Select value={reassessmentReason} onValueChange={(val) => val && setReassessmentReason(val)}>
              <SelectTrigger className="h-10 text-xs font-semibold">
                <SelectValue placeholder="Select primary reason" />
              </SelectTrigger>
              <SelectContent>
                {REASSESSMENT_REASONS.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          {/* Income & Household Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-bold text-xs">Total Monthly Household Income (₱) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={totalIncome}
                onChange={(e) => setTotalIncome(e.target.value)}
                className="h-10 font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-xs">Household Size (Dependents & Members) *</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={householdSize}
                onChange={(e) => setHouseholdSize(e.target.value)}
                className="h-10 font-mono text-sm"
              />
            </div>
          </div>

          {/* Household Expenses List */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <Label className="font-bold text-xs">Monthly Household Expenses Breakdown</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddExpense}
                className="h-7 text-xs font-bold gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Expense Item
              </Button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {expenses.map((exp, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="Expense Type (e.g. Food, Utility, Rent)"
                    value={exp.expense_type}
                    onChange={(e) => handleExpenseChange(idx, "expense_type", e.target.value)}
                    className="h-9 text-xs flex-1"
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Amount (₱)"
                    value={exp.amount}
                    onChange={(e) => handleExpenseChange(idx, "amount", e.target.value)}
                    className="h-9 text-xs font-mono w-32"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveExpense(idx)}
                    className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Calculation & Classification Preview Card */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <span className="font-bold text-primary uppercase text-[11px] tracking-wider block">
              Real-time Bracket Calculation Preview
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] text-muted-foreground">Computed Net Per Capita Income:</div>
                <div className="text-lg font-extrabold font-mono text-primary">
                  {formatCurrency(calculatedNetPerCapita)}
                  <span className="text-xs font-normal text-muted-foreground ml-1">/mo</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">
                  Calculated Tier:
                </span>
                <Badge className={`text-sm font-extrabold px-3 py-1 ${getBracketColor(finalClassification)}`}>
                  Class {finalClassification}
                </Badge>
              </div>

            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={reassessMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={reassessMutation.isPending}
              className="bg-primary text-primary-foreground font-bold shadow-md hover:shadow-lg gap-2"
            >
              {reassessMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Re-Assessment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
