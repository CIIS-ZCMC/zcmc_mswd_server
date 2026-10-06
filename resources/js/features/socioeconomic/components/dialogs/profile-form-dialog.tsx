import React, { useState } from "react"
import { useSearchParams } from "@/lib/inertia-router-hooks"
import {
  AlertCircle,
  ArrowUpRight,
  Calendar,
  Check,
  CheckCircle2,
  Droplets,
  Home,
  Lightbulb,
  PiggyBank,
  Plus,
  Receipt,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  LIGHT_SOURCE_OPTIONS,
  WATER_SOURCE_OPTIONS,
} from "@/lib/socioeconomic-constants"
import {
  EXPENSE_ITEM_KEYS,
  EXPENSE_ITEM_LABELS,
  type ExpenseItemKey,
} from "../../lib/expense-item-labels"
import { formatCurrency } from "@/lib/format-currency"
import { ApiError } from "@/lib/api-client"
import {
  useCreateSocioeconomicProfile,
  useUpdateSocioeconomicProfile,
} from "../../hooks/use-socioeconomic"
import type {
  SocioeconomicCurrent,
  LiveIncome,
  SaveSocioeconomicInput,
  OtherIncomeSource,
} from "../../types/socioeconomic.types"

interface ProfileFormDialogProps {
  isOpen: boolean
  onClose: () => void
  patientId: number | string
  initialProfile?: SocioeconomicCurrent | null
  liveIncome?: LiveIncome | null
}

interface OtherSourceRow {
  source: string
  amount: string
}

interface FormState {
  recordedOn: string
  houseTenure: "owned" | "rented" | ""
  houseRentAmount: string
  lightSource: string[]
  waterSource: string[]
  activeExpenseKeys: ExpenseItemKey[]
  expenseAmounts: Record<ExpenseItemKey, string>
  othersSpecify: string
  otherIncomeRows: OtherSourceRow[]
}

const emptyAmounts = (): Record<ExpenseItemKey, string> => ({
  food: "",
  transport: "",
  medical: "",
  insurance: "",
  education: "",
  clothing: "",
  houseHelp: "",
  others: "",
})

/** The form's starting values: the record being edited, or a blank form dated today. */
function buildInitialState(initialProfile?: SocioeconomicCurrent | null): FormState {
  if (!initialProfile) {
    return {
      recordedOn: new Date().toISOString().slice(0, 10),
      houseTenure: "owned",
      houseRentAmount: "",
      lightSource: [],
      waterSource: [],
      activeExpenseKeys: [],
      expenseAmounts: emptyAmounts(),
      othersSpecify: "",
      otherIncomeRows: [],
    }
  }

  // Expense items that have a declared value start active.
  const activeExpenseKeys: ExpenseItemKey[] = []
  const expenseAmounts = emptyAmounts()
  EXPENSE_ITEM_KEYS.forEach((key) => {
    const val = initialProfile.expenses[key]
    if (val !== null && val !== undefined) {
      activeExpenseKeys.push(key)
      expenseAmounts[key] = String(val)
    }
  })
  // An "others" note keeps the Others item active even without an amount.
  if (initialProfile.expenses.othersSpecify && !activeExpenseKeys.includes("others")) {
    activeExpenseKeys.push("others")
  }

  const tenure = initialProfile.house.tenure
  return {
    recordedOn: initialProfile.recordedOn ? initialProfile.recordedOn.slice(0, 10) : "",
    houseTenure: tenure === "rented" || tenure === "owned" ? tenure : "owned",
    houseRentAmount:
      initialProfile.house.rentAmount !== null && initialProfile.house.rentAmount !== undefined
        ? String(initialProfile.house.rentAmount)
        : "",
    lightSource: initialProfile.lightSource || [],
    waterSource: initialProfile.waterSource || [],
    activeExpenseKeys,
    expenseAmounts,
    othersSpecify: initialProfile.expenses.othersSpecify || "",
    otherIncomeRows: (initialProfile.income.otherSources || []).map((os) => ({
      source: os.source,
      amount: String(os.amount),
    })),
  }
}

/**
 * Remounts the form every time the dialog opens (or the record changes), so its state
 * starts from the props instead of being reset in an effect.
 */
export const ProfileFormDialog: React.FC<ProfileFormDialogProps> = (props) => {
  const [openCount, setOpenCount] = useState(0)
  const [wasOpen, setWasOpen] = useState(false)

  if (props.isOpen !== wasOpen) {
    setWasOpen(props.isOpen)
    if (props.isOpen) setOpenCount((count) => count + 1)
  }

  return <ProfileForm key={`${openCount}-${props.initialProfile?.id ?? "new"}`} {...props} />
}

const ProfileForm: React.FC<ProfileFormDialogProps> = ({
  isOpen,
  onClose,
  patientId,
  initialProfile,
  liveIncome,
}) => {
  const isEdit = Boolean(initialProfile)
  const [, setSearchParams] = useSearchParams()
  const [init] = useState(() => buildInitialState(initialProfile))

  // Assessment Date
  const [recordedOn, setRecordedOn] = useState(init.recordedOn)

  // House & Utilities
  const [houseTenure, setHouseTenure] = useState<"owned" | "rented" | "">(init.houseTenure)
  const [houseRentAmount, setHouseRentAmount] = useState(init.houseRentAmount)
  const [lightSource, setLightSource] = useState<string[]>(init.lightSource)
  const [waterSource, setWaterSource] = useState<string[]>(init.waterSource)

  // Appendable 8 Itemized Expenses
  const [activeExpenseKeys, setActiveExpenseKeys] = useState<ExpenseItemKey[]>(init.activeExpenseKeys)
  const [expenseAmounts, setExpenseAmounts] = useState<Record<ExpenseItemKey, string>>(init.expenseAmounts)
  const [othersSpecify, setOthersSpecify] = useState(init.othersSpecify)

  // Income Sources
  const [otherIncomeRows, setOtherIncomeRows] = useState<OtherSourceRow[]>(init.otherIncomeRows)
  const [refreshIncome, setRefreshIncome] = useState(false)

  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const createMutation = useCreateSocioeconomicProfile(patientId)
  const updateMutation = useUpdateSocioeconomicProfile(patientId)
  const isSubmitting = createMutation.isPending || updateMutation.isPending


  const handleTenureChange = (newTenure: "owned" | "rented") => {
    setHouseTenure(newTenure)
    if (newTenure === "owned") {
      setHouseRentAmount("")
    }
  }

  const handleToggleLightSource = (value: string) => {
    setLightSource((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  const handleToggleWaterSource = (value: string) => {
    setWaterSource((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  // --- Appendable Expenses Handlers ---
  const handleAppendExpense = (key: ExpenseItemKey) => {
    if (!activeExpenseKeys.includes(key)) {
      setActiveExpenseKeys((prev) => [...prev, key])
    }
  }

  const handleRemoveExpense = (key: ExpenseItemKey) => {
    setActiveExpenseKeys((prev) => prev.filter((k) => k !== key))
    setExpenseAmounts((prev) => ({ ...prev, [key]: "" }))
    if (key === "others") {
      setOthersSpecify("")
    }
  }

  const handleAppendAllExpenses = () => {
    setActiveExpenseKeys([...EXPENSE_ITEM_KEYS])
  }

  const handleExpenseAmountChange = (key: ExpenseItemKey, value: string) => {
    setExpenseAmounts((prev) => ({ ...prev, [key]: value }))
  }

  const handleAddOtherIncomeRow = () => {
    setOtherIncomeRows((prev) => [...prev, { source: "", amount: "" }])
  }

  const handleRemoveOtherIncomeRow = (index: number) => {
    setOtherIncomeRows((prev) => prev.filter((_, i) => i !== index))
  }

  const handleOtherIncomeChange = (index: number, field: keyof OtherSourceRow, value: string) => {
    setOtherIncomeRows((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const navigateToFamily = () => {
    onClose()
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set("tab", "family")
      return next
    })
  }

  // --- Live Calculations ---
  const rentNumber = houseTenure === "rented" ? parseFloat(houseRentAmount) || 0 : 0
  const eightExpensesSum = activeExpenseKeys.reduce((sum, key) => {
    const val = parseFloat(expenseAmounts[key])
    return !isNaN(val) && val > 0 ? sum + val : sum
  }, 0)
  const computedTotalExpenses = rentNumber + eightExpensesSum

  const patientIncomeVal = liveIncome?.patientIncome ?? initialProfile?.income.patientIncome ?? 0
  const familyMembersTotalVal =
    liveIncome?.familyMembersTotal ?? initialProfile?.income.familyMembersTotal ?? 0
  const otherSourcesSum = otherIncomeRows.reduce((sum, row) => {
    const amt = parseFloat(row.amount)
    return !isNaN(amt) && amt > 0 ? sum + amt : sum
  }, 0)
  const computedTotalFamilyIncome = patientIncomeVal + familyMembersTotalVal + otherSourcesSum
  const computedBalance = computedTotalFamilyIncome - computedTotalExpenses

  // Family members list for auto lines
  const displayFamilyMembers =
    liveIncome?.familyMembers ??
    (initialProfile?.income.familyMembers.map((fm, idx) => ({
      id: idx,
      name: fm.name,
      relationship: fm.relationship,
      monthlyIncome: fm.monthlyIncome,
    })) || [])

  // Un-added expense categories for quick-add chips
  const availableExpenseKeys = EXPENSE_ITEM_KEYS.filter((k) => !activeExpenseKeys.includes(k))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFieldErrors({})

    if (!recordedOn) {
      setFieldErrors({ recorded_on: "Assessment date is required" })
      return
    }

    const parseNumOrNull = (val: string) => {
      const n = parseFloat(val)
      return !isNaN(n) && n >= 0 ? n : null
    }

    const cleanedOtherSources: OtherIncomeSource[] = otherIncomeRows
      .filter((row) => row.source.trim() !== "" && !isNaN(parseFloat(row.amount)) && parseFloat(row.amount) >= 0)
      .map((row) => ({
        source: row.source.trim(),
        amount: parseFloat(row.amount),
      }))

    const payload: SaveSocioeconomicInput = {
      recordedOn,
      houseTenure: houseTenure || null,
      houseRentAmount: houseTenure === "rented" ? parseNumOrNull(houseRentAmount) : null,
      lightSource,
      waterSource,
      food: activeExpenseKeys.includes("food") ? parseNumOrNull(expenseAmounts.food) : null,
      transport: activeExpenseKeys.includes("transport") ? parseNumOrNull(expenseAmounts.transport) : null,
      medical: activeExpenseKeys.includes("medical") ? parseNumOrNull(expenseAmounts.medical) : null,
      insurance: activeExpenseKeys.includes("insurance") ? parseNumOrNull(expenseAmounts.insurance) : null,
      education: activeExpenseKeys.includes("education") ? parseNumOrNull(expenseAmounts.education) : null,
      clothing: activeExpenseKeys.includes("clothing") ? parseNumOrNull(expenseAmounts.clothing) : null,
      houseHelp: activeExpenseKeys.includes("houseHelp") ? parseNumOrNull(expenseAmounts.houseHelp) : null,
      others: activeExpenseKeys.includes("others") ? parseNumOrNull(expenseAmounts.others) : null,
      othersSpecify: activeExpenseKeys.includes("others") ? othersSpecify.trim() || null : null,
      otherIncomeSources: cleanedOtherSources,
      remarks: initialProfile?.remarks ?? null,
      ...(isEdit ? { refreshIncome } : {}),
    }

    try {
      if (isEdit && initialProfile) {
        await updateMutation.mutateAsync({ id: initialProfile.id, input: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const serverErrors: Record<string, string> = {}
        Object.entries(err.errors).forEach(([key, messages]) => {
          serverErrors[key] = messages[0] ?? ""
        })
        setFieldErrors(serverErrors)
      }
      setFormError(err instanceof Error && err.message ? err.message : "Failed to save record.")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto p-0 flex flex-col gap-0 border shadow-2xl">
        {/* Modal Header */}
        <DialogHeader className="p-5 sm:p-6 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                <Receipt className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold">
                  {isEdit ? "Update List of Expenses" : "Record List of Expenses"}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                  Financial balance overview, family income, housing status, utilities, and itemized household costs.
                </DialogDescription>
              </div>
            </div>

            {/* Assessment Date Selector */}
            <div className="flex items-center gap-2 shrink-0 bg-background px-3 py-1.5 rounded-lg border shadow-2xs">
              <Calendar className="size-4 text-primary shrink-0" />
              <div className="space-y-0.5">
                <Input
                  id="recordedOn"
                  type="date"
                  value={recordedOn}
                  onChange={(e) => setRecordedOn(e.target.value)}
                  className="h-8 text-sm font-semibold w-38 border-0 p-0 focus-visible:ring-0 bg-transparent"
                  required
                />
                {fieldErrors.recorded_on && (
                  <p className="text-xs text-destructive font-medium">{fieldErrors.recorded_on}</p>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 flex-1">
          {formError && (
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="size-4" />
              <AlertDescription className="text-sm">{formError}</AlertDescription>
            </Alert>
          )}

          {/* ================= 1. COMPACT FINANCIAL BALANCE OVERVIEW BANNER ================= */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-primary/5 border-primary/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                <PiggyBank className="size-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground">Financial Overview</span>
                  <Badge
                    variant="outline"
                    className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      computedBalance >= 0
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                    }`}
                  >
                    {computedBalance >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    <span>{computedBalance >= 0 ? "Surplus" : "Deficit"}</span>
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {computedBalance >= 0
                    ? "Monthly family income covers declared expenses."
                    : "Expenses exceed monthly family income."}
                </span>
              </div>
            </div>

            {/* Compact 3-Value Strip */}
            <div className="grid grid-cols-3 gap-2.5 shrink-0">
              <div className="px-3 py-1.5 rounded-lg bg-background border text-center shadow-2xs">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                  Total Income
                </span>
                <span className="text-sm sm:text-base font-bold text-foreground block">
                  {formatCurrency(computedTotalFamilyIncome)}
                </span>
              </div>

              <div className="px-3 py-1.5 rounded-lg bg-background border text-center shadow-2xs">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                  Total Expenses
                </span>
                <span className="text-sm sm:text-base font-bold text-foreground block">
                  {formatCurrency(computedTotalExpenses)}
                </span>
              </div>

              <div
                className={`px-3 py-1.5 rounded-lg border text-center shadow-2xs ${
                  computedBalance >= 0
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                }`}
              >
                <span className="text-xs font-semibold uppercase tracking-wider block opacity-85">
                  Net Balance
                </span>
                <span className="text-sm sm:text-base font-bold block">
                  {formatCurrency(computedBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* ================= 2. FAMILY INCOME BREAKDOWN ================= */}
          <Card className="shadow-2xs border bg-card">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="size-4.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-bold text-foreground uppercase tracking-wide">
                    Family Income Breakdown
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={navigateToFamily}
                  className="h-6 text-xs font-semibold text-primary hover:text-primary gap-1 px-2 cursor-pointer"
                >
                  <span>Manage family</span>
                  <ArrowUpRight className="size-3.5" />
                </Button>
              </div>

              {/* Compact Inline Incomes Grid */}
              <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg border bg-muted/20 text-sm">
                <span className="text-xs font-medium text-muted-foreground">Declared:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border text-xs sm:text-sm font-medium shadow-2xs">
                  <span className="text-muted-foreground">Patient:</span>
                  <strong className="text-foreground font-bold">{formatCurrency(patientIncomeVal)}</strong>
                </span>

                {displayFamilyMembers.map((fm, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border text-xs sm:text-sm font-medium shadow-2xs"
                  >
                    <span className="text-muted-foreground truncate max-w-[150px]">
                      {fm.name} ({fm.relationship || "Member"}):
                    </span>
                    <strong className="text-foreground font-bold">{formatCurrency(fm.monthlyIncome)}</strong>
                  </span>
                ))}
              </div>

              {/* Other Income Repeater */}
              <div className="space-y-2 pt-1 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Other Family Incomes</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddOtherIncomeRow}
                    className="h-7 text-xs font-medium gap-1 px-2.5 cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>Add Source</span>
                  </Button>
                </div>

                {otherIncomeRows.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {otherIncomeRows.map((row, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          placeholder="Source (e.g. Sari-sari, Remittance)"
                          value={row.source}
                          onChange={(e) => handleOtherIncomeChange(index, "source", e.target.value)}
                          className="h-8 text-sm flex-1 bg-background"
                        />
                        <div className="w-32 relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                            ₱
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={row.amount}
                            onChange={(e) => handleOtherIncomeChange(index, "amount", e.target.value)}
                            className="h-8 text-sm pl-6 text-right font-semibold bg-background"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOtherIncomeRow(index)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Refresh Income Switch (Edit mode only) */}
              {isEdit && (
                <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/15 text-sm">
                  <div className="space-y-0.5">
                    <Label htmlFor="refreshIncome" className="text-sm font-semibold cursor-pointer">
                      Refresh income from family records
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Re-reads current monthly incomes from latest family members master list.
                    </p>
                  </div>
                  <Switch
                    id="refreshIncome"
                    checked={refreshIncome}
                    onCheckedChange={setRefreshIncome}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* ================= 3. HOUSE STATUS & UTILITIES ================= */}
          <Card className="shadow-2xs border bg-card">
            <CardHeader className="py-3 px-4 border-b bg-muted/10">
              <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
                <Home className="size-4.5 text-amber-600 dark:text-amber-400" />
                <span>House / Lot Status & Utilities</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* House / Lot Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-foreground">House / Lot Arrangement</Label>
                  {houseTenure === "rented" && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      Rent will be factored into total expenses
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleTenureChange("owned")}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      houseTenure === "owned"
                        ? "bg-primary/10 border-primary text-primary font-semibold shadow-xs ring-1 ring-primary"
                        : "bg-background hover:bg-muted/50 border-border text-muted-foreground"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${houseTenure === "owned" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <Home className="size-4.5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold block">Owned</span>
                      <span className="text-xs text-muted-foreground">Fully owned dwelling</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTenureChange("rented")}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      houseTenure === "rented"
                        ? "bg-primary/10 border-primary text-primary font-semibold shadow-xs ring-1 ring-primary"
                        : "bg-background hover:bg-muted/50 border-border text-muted-foreground"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${houseTenure === "rented" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <Receipt className="size-4.5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold block">Rented</span>
                      <span className="text-xs text-muted-foreground">Rented apartment / room</span>
                    </div>
                  </button>
                </div>

                {/* Monthly Rent Input (when rented) */}
                {houseTenure === "rented" && (
                  <div className="p-3.5 rounded-lg border bg-amber-500/5 border-amber-500/20 space-y-1.5 animate-in fade-in-50 duration-150">
                    <Label htmlFor="houseRentAmount" className="text-sm font-semibold text-foreground">
                      Monthly House Rent (₱) <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                        ₱
                      </span>
                      <Input
                        id="houseRentAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={houseRentAmount}
                        onChange={(e) => setHouseRentAmount(e.target.value)}
                        className="h-9 text-sm pl-7 text-right font-semibold bg-background"
                        required={houseTenure === "rented"}
                      />
                    </div>
                    {fieldErrors.house_rent_amount && (
                      <p className="text-xs text-destructive font-medium">{fieldErrors.house_rent_amount}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Light & Water Sources Multi-select Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                {/* Light Source */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                    <Lightbulb className="size-4 text-amber-500" />
                    <span>Light Source</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {LIGHT_SOURCE_OPTIONS.map((opt) => {
                      const selected = lightSource.includes(opt.value)
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleToggleLightSource(opt.value)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
                            selected
                              ? "bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/50 shadow-2xs"
                              : "bg-background hover:bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {selected ? <Check className="size-3.5 text-amber-600 dark:text-amber-300" /> : null}
                          <span>{opt.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Water Source */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                    <Droplets className="size-4 text-blue-500" />
                    <span>Water Source</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {WATER_SOURCE_OPTIONS.map((opt) => {
                      const selected = waterSource.includes(opt.value)
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleToggleWaterSource(opt.value)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
                            selected
                              ? "bg-blue-500/15 text-blue-900 dark:text-blue-200 border-blue-500/50 shadow-2xs"
                              : "bg-background hover:bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {selected ? <Check className="size-3.5 text-blue-600 dark:text-blue-300" /> : null}
                          <span>{opt.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ================= 4. APPENDABLE MONTHLY HOUSEHOLD EXPENSES ================= */}
          <Card className="shadow-2xs border bg-card">
            <CardHeader className="py-3 px-4 border-b bg-muted/10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
                  <Receipt className="size-4.5 text-violet-600 dark:text-violet-400" />
                  <span>Itemized Monthly Household Expenses</span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  {availableExpenseKeys.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleAppendAllExpenses}
                      className="h-6 text-xs text-muted-foreground hover:text-foreground px-2 cursor-pointer font-medium"
                    >
                      + Add All Items
                    </Button>
                  )}
                  <Badge
                    variant="outline"
                    className="text-xs sm:text-sm font-bold bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30"
                  >
                    Subtotal: {formatCurrency(eightExpensesSum)}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {/* Quick-Add Category Badges */}
              {availableExpenseKeys.length > 0 && (
                <div className="space-y-2 p-3 rounded-xl border bg-muted/15">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Click to append expense category:
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {availableExpenseKeys.length} available
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableExpenseKeys.map((key) => {
                      const label = EXPENSE_ITEM_LABELS[key]
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleAppendExpense(key)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border bg-background hover:bg-primary/10 hover:text-primary hover:border-primary/40 text-foreground transition-colors cursor-pointer shadow-2xs"
                        >
                          <Plus className="size-3.5 text-primary" />
                          <span>{label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Table of Active Appended Expenses */}
              {activeExpenseKeys.length === 0 ? (
                <div className="text-center py-8 border rounded-xl bg-muted/10 space-y-1.5">
                  <Receipt className="size-7 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-sm font-semibold text-foreground">No monthly expense items added yet.</p>
                  <p className="text-xs text-muted-foreground">
                    Click any category badge above (e.g., Food, Medical, Transpo) to append an expense.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-12 text-center text-xs sm:text-sm font-bold">#</TableHead>
                        <TableHead className="text-xs sm:text-sm font-bold">Expense Category</TableHead>
                        <TableHead className="w-48 sm:w-60 text-right text-xs sm:text-sm font-bold">
                          Monthly Amount (₱)
                        </TableHead>
                        <TableHead className="w-12 p-0"></TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {activeExpenseKeys.map((key, index) => {
                        const label = EXPENSE_ITEM_LABELS[key]
                        const isOthers = key === "others"

                        return (
                          <TableRow key={key} className={isOthers ? "bg-muted/10" : ""}>
                            <TableCell className="text-center text-sm font-medium text-muted-foreground">
                              {index + 1}
                            </TableCell>
                            <TableCell className="align-middle py-2.5">
                              <Label htmlFor={`expense-${key}`} className="text-sm font-semibold text-foreground block cursor-pointer">
                                {label}
                              </Label>
                              {isOthers && (
                                <Input
                                  id="othersSpecify"
                                  placeholder="Specify details for other expenses..."
                                  value={othersSpecify}
                                  onChange={(e) => setOthersSpecify(e.target.value)}
                                  className="h-8 text-sm mt-1.5 bg-background placeholder:text-muted-foreground/60"
                                />
                              )}
                            </TableCell>
                            <TableCell className="text-right align-middle py-2.5">
                              <div className="relative inline-block w-full sm:w-48">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                                  ₱
                                </span>
                                <Input
                                  id={`expense-${key}`}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={expenseAmounts[key]}
                                  onChange={(e) => handleExpenseAmountChange(key, e.target.value)}
                                  className="h-9 text-sm pl-7 text-right font-semibold bg-background"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-center align-middle p-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveExpense(key)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                                title={`Remove ${label}`}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>

                    <TableFooter className="bg-muted/40 font-semibold">
                      <TableRow>
                        <TableCell colSpan={2} className="text-sm font-bold text-foreground">
                          Itemized Expenses Subtotal ({activeExpenseKeys.length} items)
                        </TableCell>
                        <TableCell className="text-right text-sm sm:text-base font-bold text-foreground">
                          {formatCurrency(eightExpensesSum)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      {houseTenure === "rented" && (
                        <TableRow className="bg-muted/20">
                          <TableCell colSpan={2} className="text-sm text-muted-foreground">
                            + Monthly House Rent
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold text-foreground">
                            {formatCurrency(rentNumber)}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      )}
                      <TableRow className="bg-primary/5 text-primary">
                        <TableCell colSpan={2} className="text-sm sm:text-base font-bold">
                          Grand Total Monthly Expenses (Rent + Items)
                        </TableCell>
                        <TableCell className="text-right text-sm sm:text-base font-bold">
                          {formatCurrency(computedTotalExpenses)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modal Footer */}
          <DialogFooter className="pt-4 border-t gap-2 flex flex-row items-center justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-sm font-medium cursor-pointer h-9 px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="text-sm font-semibold gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-5"
            >
              {isSubmitting ? (
                "Saving..."
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  <span>{isEdit ? "Save Changes" : "Save Record"}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
