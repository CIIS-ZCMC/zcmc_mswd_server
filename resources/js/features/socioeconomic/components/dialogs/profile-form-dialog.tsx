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
  lightAmount: string
  waterSource: string[]
  waterAmount: string
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
function buildInitialState(
  initialProfile?: SocioeconomicCurrent | null
): FormState {
  if (!initialProfile) {
    return {
      recordedOn: new Date().toISOString().slice(0, 10),
      houseTenure: "owned",
      houseRentAmount: "",
      lightSource: [],
      lightAmount: "",
      waterSource: [],
      waterAmount: "",
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
  if (
    initialProfile.expenses.othersSpecify &&
    !activeExpenseKeys.includes("others")
  ) {
    activeExpenseKeys.push("others")
  }

  const tenure = initialProfile.house.tenure
  return {
    recordedOn: initialProfile.recordedOn
      ? initialProfile.recordedOn.slice(0, 10)
      : "",
    houseTenure: tenure === "rented" || tenure === "owned" ? tenure : "owned",
    houseRentAmount:
      initialProfile.house.rentAmount !== null &&
      initialProfile.house.rentAmount !== undefined
        ? String(initialProfile.house.rentAmount)
        : "",
    lightSource: initialProfile.lightSource || [],
    lightAmount:
      initialProfile.lightAmount !== null &&
      initialProfile.lightAmount !== undefined
        ? String(initialProfile.lightAmount)
        : "",
    waterSource: initialProfile.waterSource || [],
    waterAmount:
      initialProfile.waterAmount !== null &&
      initialProfile.waterAmount !== undefined
        ? String(initialProfile.waterAmount)
        : "",
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

  return (
    <ProfileForm
      key={`${openCount}-${props.initialProfile?.id ?? "new"}`}
      {...props}
    />
  )
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
  const [houseTenure, setHouseTenure] = useState<"owned" | "rented" | "">(
    init.houseTenure
  )
  const [houseRentAmount, setHouseRentAmount] = useState(init.houseRentAmount)
  const [lightSource, setLightSource] = useState<string[]>(init.lightSource)
  const [lightAmount, setLightAmount] = useState(init.lightAmount)
  const [waterSource, setWaterSource] = useState<string[]>(init.waterSource)
  const [waterAmount, setWaterAmount] = useState(init.waterAmount)

  // Appendable 8 Itemized Expenses
  const [activeExpenseKeys, setActiveExpenseKeys] = useState<ExpenseItemKey[]>(
    init.activeExpenseKeys
  )
  const [expenseAmounts, setExpenseAmounts] = useState<
    Record<ExpenseItemKey, string>
  >(init.expenseAmounts)
  const [othersSpecify, setOthersSpecify] = useState(init.othersSpecify)

  // Income Sources
  const [otherIncomeRows, setOtherIncomeRows] = useState<OtherSourceRow[]>(
    init.otherIncomeRows
  )
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
    setLightSource((prev) => {
      const next = prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
      if (next.length === 0) setLightAmount("")
      return next
    })
  }

  const handleToggleWaterSource = (value: string) => {
    setWaterSource((prev) => {
      const next = prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
      if (next.length === 0) setWaterAmount("")
      return next
    })
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

  const handleOtherIncomeChange = (
    index: number,
    field: keyof OtherSourceRow,
    value: string
  ) => {
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
  const rentNumber =
    houseTenure === "rented" ? parseFloat(houseRentAmount) || 0 : 0
  const lightNumber = lightSource.length > 0 ? parseFloat(lightAmount) || 0 : 0
  const waterNumber = waterSource.length > 0 ? parseFloat(waterAmount) || 0 : 0
  const eightExpensesSum = activeExpenseKeys.reduce((sum, key) => {
    const val = parseFloat(expenseAmounts[key])
    return !isNaN(val) && val > 0 ? sum + val : sum
  }, 0)
  const computedTotalExpenses =
    rentNumber + lightNumber + waterNumber + eightExpensesSum

  const patientIncomeVal =
    liveIncome?.patientIncome ?? initialProfile?.income.patientIncome ?? 0
  const familyMembersTotalVal =
    liveIncome?.familyMembersTotal ??
    initialProfile?.income.familyMembersTotal ??
    0
  const otherSourcesSum = otherIncomeRows.reduce((sum, row) => {
    const amt = parseFloat(row.amount)
    return !isNaN(amt) && amt > 0 ? sum + amt : sum
  }, 0)
  const computedTotalFamilyIncome =
    patientIncomeVal + familyMembersTotalVal + otherSourcesSum
  const computedBalance = computedTotalFamilyIncome - computedTotalExpenses

  // Family members list for auto lines
  const displayFamilyMembers =
    liveIncome?.familyMembers ??
    (initialProfile?.income.familyMembers.map((fm, idx) => ({
      id: idx,
      name: fm.name,
      relationship: fm.relationship,
      monthlyIncome: fm.monthlyIncome,
    })) ||
      [])

  // Un-added expense categories for quick-add chips
  const availableExpenseKeys = EXPENSE_ITEM_KEYS.filter(
    (k) => !activeExpenseKeys.includes(k)
  )

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
      .filter(
        (row) =>
          row.source.trim() !== "" &&
          !isNaN(parseFloat(row.amount)) &&
          parseFloat(row.amount) >= 0
      )
      .map((row) => ({
        source: row.source.trim(),
        amount: parseFloat(row.amount),
      }))

    const payload: SaveSocioeconomicInput = {
      recordedOn,
      houseTenure: houseTenure || null,
      houseRentAmount:
        houseTenure === "rented" ? parseNumOrNull(houseRentAmount) : null,
      lightSource,
      lightAmount: lightSource.length > 0 ? parseNumOrNull(lightAmount) : null,
      waterSource,
      waterAmount: waterSource.length > 0 ? parseNumOrNull(waterAmount) : null,
      food: activeExpenseKeys.includes("food")
        ? parseNumOrNull(expenseAmounts.food)
        : null,
      transport: activeExpenseKeys.includes("transport")
        ? parseNumOrNull(expenseAmounts.transport)
        : null,
      medical: activeExpenseKeys.includes("medical")
        ? parseNumOrNull(expenseAmounts.medical)
        : null,
      insurance: activeExpenseKeys.includes("insurance")
        ? parseNumOrNull(expenseAmounts.insurance)
        : null,
      education: activeExpenseKeys.includes("education")
        ? parseNumOrNull(expenseAmounts.education)
        : null,
      clothing: activeExpenseKeys.includes("clothing")
        ? parseNumOrNull(expenseAmounts.clothing)
        : null,
      houseHelp: activeExpenseKeys.includes("houseHelp")
        ? parseNumOrNull(expenseAmounts.houseHelp)
        : null,
      others: activeExpenseKeys.includes("others")
        ? parseNumOrNull(expenseAmounts.others)
        : null,
      othersSpecify: activeExpenseKeys.includes("others")
        ? othersSpecify.trim() || null
        : null,
      otherIncomeSources: cleanedOtherSources,
      remarks: initialProfile?.remarks ?? null,
      ...(isEdit ? { refreshIncome } : {}),
    }

    try {
      if (isEdit && initialProfile) {
        await updateMutation.mutateAsync({
          id: initialProfile.id,
          input: payload,
        })
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
      setFormError(
        err instanceof Error && err.message
          ? err.message
          : "Failed to save record."
      )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-y-auto rounded-[20px] border border-[#e4e9f2] p-0 font-[Plus_Jakarta_Sans,sans-serif] shadow-2xl sm:max-w-4xl dark:border-border">
        {/* Modal Header */}
        <DialogHeader className="border-b border-[#e4e9f2] bg-[#f4f7fc] p-5 sm:p-6 dark:border-border dark:bg-muted/40">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#edf3fe] text-[#1f5fd6] dark:bg-primary/20">
                <Receipt className="size-4.5" />
              </div>
              <div>
                <DialogTitle className="text-[18px] font-bold text-[#0c2a5b] dark:text-foreground">
                  {isEdit
                    ? "Update List of Expenses"
                    : "Record List of Expenses"}
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-[13px] text-[#5b6678] dark:text-muted-foreground">
                  Financial balance overview, family income, housing status,
                  utilities, and itemized household costs.
                </DialogDescription>
              </div>
            </div>

            {/* Assessment Date Selector */}
            <div className="flex shrink-0 items-center gap-2 rounded-full border border-[#cfd7e4] bg-white px-3 py-1.5 shadow-xs dark:border-border dark:bg-card">
              <Calendar className="size-4 shrink-0 text-[#1f5fd6]" />
              <div className="space-y-0.5">
                <Input
                  id="recordedOn"
                  type="date"
                  value={recordedOn}
                  onChange={(e) => setRecordedOn(e.target.value)}
                  className="h-7 w-38 border-0 bg-transparent p-0 text-[13px] font-semibold text-[#1b2433] focus-visible:ring-0 dark:text-foreground"
                  required
                />
                {fieldErrors.recorded_on && (
                  <p className="text-xs font-medium text-destructive">
                    {fieldErrors.recorded_on}
                  </p>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 p-5 sm:p-6">
          {formError && (
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="size-4" />
              <AlertDescription className="text-sm">
                {formError}
              </AlertDescription>
            </Alert>
          )}

          {/* ================= 1. COMPACT FINANCIAL BALANCE OVERVIEW BANNER ================= */}
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
                <PiggyBank className="size-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">
                    Financial Overview
                  </span>
                  <Badge
                    variant="outline"
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                      computedBalance >= 0
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {computedBalance >= 0 ? (
                      <TrendingUp className="size-3" />
                    ) : (
                      <TrendingDown className="size-3" />
                    )}
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
            <div className="grid shrink-0 grid-cols-3 gap-2.5">
              <div className="rounded-lg border bg-background px-3 py-1.5 text-center shadow-2xs">
                <span className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Total Income
                </span>
                <span className="block text-sm font-bold text-foreground sm:text-base">
                  {formatCurrency(computedTotalFamilyIncome)}
                </span>
              </div>

              <div className="rounded-lg border bg-background px-3 py-1.5 text-center shadow-2xs">
                <span className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Total Expenses
                </span>
                <span className="block text-sm font-bold text-foreground sm:text-base">
                  {formatCurrency(computedTotalExpenses)}
                </span>
              </div>

              <div
                className={`rounded-lg border px-3 py-1.5 text-center shadow-2xs ${
                  computedBalance >= 0
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                }`}
              >
                <span className="block text-xs font-semibold tracking-wider uppercase opacity-85">
                  Net Balance
                </span>
                <span className="block text-sm font-bold sm:text-base">
                  {formatCurrency(computedBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* ================= 2. FAMILY INCOME BREAKDOWN ================= */}
          <Card className="border bg-card shadow-2xs">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="size-4.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-bold tracking-wide text-foreground uppercase">
                    Family Income Breakdown
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={navigateToFamily}
                  className="h-6 cursor-pointer gap-1 px-2 text-xs font-semibold text-primary hover:text-primary"
                >
                  <span>Manage family</span>
                  <ArrowUpRight className="size-3.5" />
                </Button>
              </div>

              {/* Compact Inline Incomes Grid */}
              <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-2.5 text-sm">
                <span className="text-xs font-medium text-muted-foreground">
                  Declared:
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs font-medium shadow-2xs sm:text-sm">
                  <span className="text-muted-foreground">Patient:</span>
                  <strong className="font-bold text-foreground">
                    {formatCurrency(patientIncomeVal)}
                  </strong>
                </span>

                {displayFamilyMembers.map((fm, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs font-medium shadow-2xs sm:text-sm"
                  >
                    <span className="max-w-[150px] truncate text-muted-foreground">
                      {fm.name} ({fm.relationship || "Member"}):
                    </span>
                    <strong className="font-bold text-foreground">
                      {formatCurrency(fm.monthlyIncome)}
                    </strong>
                  </span>
                ))}
              </div>

              {/* Other Income Repeater */}
              <div className="space-y-2 border-t pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    Other Family Incomes
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddOtherIncomeRow}
                    className="h-7 cursor-pointer gap-1 px-2.5 text-xs font-medium"
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
                          onChange={(e) =>
                            handleOtherIncomeChange(
                              index,
                              "source",
                              e.target.value
                            )
                          }
                          className="h-8 flex-1 bg-background text-sm"
                        />
                        <div className="relative w-32">
                          <span className="absolute top-1/2 left-2.5 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                            ₱
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={row.amount}
                            onChange={(e) =>
                              handleOtherIncomeChange(
                                index,
                                "amount",
                                e.target.value
                              )
                            }
                            className="h-8 bg-background pl-6 text-right text-sm font-semibold"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOtherIncomeRow(index)}
                          className="h-8 w-8 shrink-0 cursor-pointer p-0 text-muted-foreground hover:text-destructive"
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
                <div className="flex items-center justify-between rounded-lg border bg-muted/15 p-2.5 text-sm">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="refreshIncome"
                      className="cursor-pointer text-sm font-semibold"
                    >
                      Refresh income from family records
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Re-reads current monthly incomes from latest family
                      members master list.
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
          <Card className="border bg-card shadow-2xs">
            <CardHeader className="border-b bg-muted/10 px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold tracking-wider text-foreground uppercase">
                <Home className="size-4.5 text-amber-600 dark:text-amber-400" />
                <span>House / Lot Status & Utilities</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
              {/* House / Lot Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-foreground">
                    House / Lot Arrangement
                  </Label>
                  {houseTenure === "rented" && (
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      Rent will be factored into total expenses
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleTenureChange("owned")}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                      houseTenure === "owned"
                        ? "border-primary bg-primary/10 font-semibold text-primary shadow-xs ring-1 ring-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <div
                      className={`rounded-lg p-2 ${houseTenure === "owned" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    >
                      <Home className="size-4.5" />
                    </div>
                    <div>
                      <span className="block text-sm font-bold">Owned</span>
                      <span className="text-xs text-muted-foreground">
                        Fully owned dwelling
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTenureChange("rented")}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                      houseTenure === "rented"
                        ? "border-primary bg-primary/10 font-semibold text-primary shadow-xs ring-1 ring-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <div
                      className={`rounded-lg p-2 ${houseTenure === "rented" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    >
                      <Receipt className="size-4.5" />
                    </div>
                    <div>
                      <span className="block text-sm font-bold">Rented</span>
                      <span className="text-xs text-muted-foreground">
                        Rented apartment / room
                      </span>
                    </div>
                  </button>
                </div>

                {/* Monthly Rent Input (when rented) */}
                {houseTenure === "rented" && (
                  <div className="animate-in space-y-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5 duration-150 fade-in-50">
                    <Label
                      htmlFor="houseRentAmount"
                      className="text-sm font-semibold text-foreground"
                    >
                      Monthly House Rent (₱){" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm font-bold text-muted-foreground">
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
                        className="h-9 bg-background pl-7 text-right text-sm font-semibold"
                        required={houseTenure === "rented"}
                      />
                    </div>
                    {fieldErrors.house_rent_amount && (
                      <p className="text-xs font-medium text-destructive">
                        {fieldErrors.house_rent_amount}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Light & Water Sources Multi-select Badges + Monthly Amounts */}
              <div className="grid grid-cols-1 gap-4 border-t pt-2 sm:grid-cols-2">
                {/* Light Source */}
                <div className="space-y-2.5">
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
                          className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
                            selected
                              ? "border-amber-500/50 bg-amber-500/15 text-amber-900 shadow-2xs dark:text-amber-200"
                              : "border-border bg-background text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {selected ? (
                            <Check className="size-3.5 text-amber-600 dark:text-amber-300" />
                          ) : null}
                          <span>{opt.label}</span>
                        </button>
                      )
                    })}
                  </div>
                  {lightSource.length > 0 && (
                    <div className="animate-in space-y-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 duration-150 fade-in-50">
                      <Label
                        htmlFor="lightAmount"
                        className="text-xs font-semibold text-foreground"
                      >
                        Monthly Light / Power Amount (₱)
                      </Label>
                      <div className="relative">
                        <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                          ₱
                        </span>
                        <Input
                          id="lightAmount"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={lightAmount}
                          onChange={(e) => setLightAmount(e.target.value)}
                          className="h-9 bg-background pl-7 text-right text-sm font-semibold"
                        />
                      </div>
                      {fieldErrors.light_amount && (
                        <p className="text-xs font-medium text-destructive">
                          {fieldErrors.light_amount}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Water Source */}
                <div className="space-y-2.5">
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
                          className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
                            selected
                              ? "border-blue-500/50 bg-blue-500/15 text-blue-900 shadow-2xs dark:text-blue-200"
                              : "border-border bg-background text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {selected ? (
                            <Check className="size-3.5 text-blue-600 dark:text-blue-300" />
                          ) : null}
                          <span>{opt.label}</span>
                        </button>
                      )
                    })}
                  </div>
                  {waterSource.length > 0 && (
                    <div className="animate-in space-y-1.5 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 duration-150 fade-in-50">
                      <Label
                        htmlFor="waterAmount"
                        className="text-xs font-semibold text-foreground"
                      >
                        Monthly Water Amount (₱)
                      </Label>
                      <div className="relative">
                        <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                          ₱
                        </span>
                        <Input
                          id="waterAmount"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={waterAmount}
                          onChange={(e) => setWaterAmount(e.target.value)}
                          className="h-9 bg-background pl-7 text-right text-sm font-semibold"
                        />
                      </div>
                      {fieldErrors.water_amount && (
                        <p className="text-xs font-medium text-destructive">
                          {fieldErrors.water_amount}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ================= 4. APPENDABLE MONTHLY HOUSEHOLD EXPENSES ================= */}
          <Card className="border bg-card shadow-2xs">
            <CardHeader className="border-b bg-muted/10 px-4 py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-bold tracking-wider text-foreground uppercase">
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
                      className="h-6 cursor-pointer px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      + Add All Items
                    </Button>
                  )}
                  <Badge
                    variant="outline"
                    className="border-violet-500/30 bg-violet-500/10 text-xs font-bold text-violet-700 sm:text-sm dark:text-violet-300"
                  >
                    Subtotal: {formatCurrency(eightExpensesSum)}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 p-4">
              {/* Quick-Add Category Badges */}
              {availableExpenseKeys.length > 0 && (
                <div className="space-y-2 rounded-xl border bg-muted/15 p-3">
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
                          className="flex cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-2xs transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary sm:text-sm"
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
                <div className="space-y-1.5 rounded-xl border bg-muted/10 py-8 text-center">
                  <Receipt className="mx-auto size-7 text-muted-foreground opacity-50" />
                  <p className="text-sm font-semibold text-foreground">
                    No monthly expense items added yet.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Click any category badge above (e.g., Food, Medical,
                    Transpo) to append an expense.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-12 text-center text-xs font-bold sm:text-sm">
                          #
                        </TableHead>
                        <TableHead className="text-xs font-bold sm:text-sm">
                          Expense Category
                        </TableHead>
                        <TableHead className="w-48 text-right text-xs font-bold sm:w-60 sm:text-sm">
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
                          <TableRow
                            key={key}
                            className={isOthers ? "bg-muted/10" : ""}
                          >
                            <TableCell className="text-center text-sm font-medium text-muted-foreground">
                              {index + 1}
                            </TableCell>
                            <TableCell className="py-2.5 align-middle">
                              <Label
                                htmlFor={`expense-${key}`}
                                className="block cursor-pointer text-sm font-semibold text-foreground"
                              >
                                {label}
                              </Label>
                              {isOthers && (
                                <Input
                                  id="othersSpecify"
                                  placeholder="Specify details for other expenses..."
                                  value={othersSpecify}
                                  onChange={(e) =>
                                    setOthersSpecify(e.target.value)
                                  }
                                  className="mt-1.5 h-8 bg-background text-sm placeholder:text-muted-foreground/60"
                                />
                              )}
                            </TableCell>
                            <TableCell className="py-2.5 text-right align-middle">
                              <div className="relative inline-block w-full sm:w-48">
                                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                                  ₱
                                </span>
                                <Input
                                  id={`expense-${key}`}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={expenseAmounts[key]}
                                  onChange={(e) =>
                                    handleExpenseAmountChange(
                                      key,
                                      e.target.value
                                    )
                                  }
                                  className="h-9 bg-background pl-7 text-right text-sm font-semibold"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="p-1 text-center align-middle">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveExpense(key)}
                                className="h-8 w-8 cursor-pointer p-0 text-muted-foreground hover:text-destructive"
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
                        <TableCell
                          colSpan={2}
                          className="text-sm font-bold text-foreground"
                        >
                          Itemized Expenses Subtotal ({activeExpenseKeys.length}{" "}
                          items)
                        </TableCell>
                        <TableCell className="text-right text-sm font-bold text-foreground sm:text-base">
                          {formatCurrency(eightExpensesSum)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      {houseTenure === "rented" && (
                        <TableRow className="bg-muted/20">
                          <TableCell
                            colSpan={2}
                            className="text-sm text-muted-foreground"
                          >
                            + Monthly House Rent
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold text-foreground">
                            {formatCurrency(rentNumber)}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      )}
                      <TableRow className="bg-primary/5 text-primary">
                        <TableCell
                          colSpan={2}
                          className="text-sm font-bold sm:text-base"
                        >
                          Grand Total Monthly Expenses (Rent + Items)
                        </TableCell>
                        <TableCell className="text-right text-sm font-bold sm:text-base">
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
          <DialogFooter className="flex flex-row items-center justify-end gap-2.5 border-t border-[#e4e9f2] p-4 sm:p-5 dark:border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-[36px] cursor-pointer rounded-full border-[#cfd7e4] px-5 text-[13px] font-semibold hover:bg-[#f4f7fc] dark:border-border dark:hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-[36px] cursor-pointer gap-2 rounded-full bg-[#1f5fd6] px-6 text-[13px] font-bold text-white shadow-[0px_6px_7px_rgba(31,95,214,0.25)] transition-all hover:bg-[#1a53bd]"
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
