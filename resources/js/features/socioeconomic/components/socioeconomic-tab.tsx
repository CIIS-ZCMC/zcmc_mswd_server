import React, { useState } from "react"
import {
  AlertCircle,
  Plus,
  RefreshCw,
  Receipt,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { useQueueActionGate } from "@/features/queue"
import type { PatientRecord } from "@/features/patients/types"
import { formatCurrency } from "@/lib/format-currency"
import {
  useSocioeconomic,
  useDeleteSocioeconomicProfile,
} from "../hooks/use-socioeconomic"
import { SocioeconomicHeader } from "./socioeconomic-header"
import { ExpensesCard } from "./expenses-card"
import { IncomeCard } from "./income-card"
import { TrendCard } from "./trend-card"
import { ProfileFormDialog } from "./dialogs/profile-form-dialog"

interface SocioeconomicTabProps {
  patient: PatientRecord
}

export const SocioeconomicTab: React.FC<SocioeconomicTabProps> = ({
  patient,
}) => {
  const patientId = patient.id
  const canView = usePermission("socioeconomic.view")
  const canCreate = usePermission("socioeconomic.create")
  const canUpdate = usePermission("socioeconomic.update")
  const canDelete = usePermission("socioeconomic.delete")
  const { canPerformActions, reason } = useQueueActionGate()

  const { data, isLoading, isError, error, refetch, isFetching } =
    useSocioeconomic(patientId)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const deleteMutation = useDeleteSocioeconomicProfile(patientId)

  const handleOpenCreate = () => {
    setIsEditing(false)
    setIsFormOpen(true)
  }

  const handleOpenEdit = () => {
    setIsEditing(true)
    setIsFormOpen(true)
  }

  const handleDeleteCurrent = async () => {
    if (!data?.current) return
    try {
      await deleteMutation.mutateAsync(data.current.id)
      setIsDeleteDialogOpen(false)
    } catch {
      // Error handled by mutation
    }
  }

  if (!canView) {
    return (
      <div className="rounded-2xl border border-dashed bg-card/40 p-10 text-center">
        <Receipt className="mx-auto mb-3 size-12 text-muted-foreground/50" />
        <h3 className="text-base font-bold text-foreground">
          Access Restricted
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          You do not have permission to view patient expense and living
          evaluation records.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <Alert variant="destructive" className="rounded-2xl">
        <AlertCircle className="size-5" />
        <AlertTitle className="text-base font-bold">
          Failed to load expense records
        </AlertTitle>
        <AlertDescription className="mt-1.5 flex flex-col justify-between gap-3 text-sm sm:flex-row sm:items-center">
          <span>
            {(error as Error)?.message ||
              "An unexpected network or server error occurred."}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 shrink-0 cursor-pointer gap-1.5 bg-background text-xs font-semibold hover:bg-muted"
          >
            <RefreshCw
              className={`size-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            <span>Retry</span>
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  const current = data?.current
  const totalIncome = current?.income.totalFamilyIncome ?? 0
  const totalExpenses = current?.total ?? 0
  const netBalance = current?.income.balance ?? totalIncome - totalExpenses

  return (
    <div className="space-y-5 pb-8 font-[Plus_Jakarta_Sans,sans-serif]">
      {current ? (
        <>
          {/* Header */}
          <SocioeconomicHeader
            current={current}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={handleOpenEdit}
            onDelete={() => setIsDeleteDialogOpen(true)}
          />

          {/* 3 Large Top KPI Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* KPI 1: Total Family Income */}
            <div className="rounded-[16px] border border-[#e4e9f2] bg-white p-5 shadow-[0px_1px_2px_0px_rgba(12,42,91,0.04),0px_2px_6px_0px_rgba(12,42,91,0.05)] dark:border-border dark:bg-card">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold tracking-wider text-[#5b6678] uppercase dark:text-muted-foreground">
                    Total Family Income
                  </span>
                  <div className="flex size-[36px] items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <PiggyBank className="size-5" />
                  </div>
                </div>
                <div className="font-mono text-[26px] font-extrabold tracking-tight text-[#0c2a5b] dark:text-foreground">
                  {formatCurrency(totalIncome)}
                </div>
                <p className="text-[12px] text-[#5b6678] dark:text-muted-foreground">
                  Patient ({formatCurrency(current.income.patientIncome)}) +
                  declared members
                </p>
              </div>
            </div>

            {/* KPI 2: Total Monthly Expenses */}
            <div className="rounded-[16px] border border-[#e4e9f2] bg-white p-5 shadow-[0px_1px_2px_0px_rgba(12,42,91,0.04),0px_2px_6px_0px_rgba(12,42,91,0.05)] dark:border-border dark:bg-card">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold tracking-wider text-[#5b6678] uppercase dark:text-muted-foreground">
                    Total Monthly Expenses
                  </span>
                  <div className="flex size-[36px] items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    <Receipt className="size-5" />
                  </div>
                </div>
                <div className="font-mono text-[26px] font-extrabold tracking-tight text-[#0c2a5b] dark:text-foreground">
                  {formatCurrency(totalExpenses)}
                </div>
                <p className="text-[12px] text-[#5b6678] dark:text-muted-foreground">
                  Living costs{" "}
                  {current.house.rentAmount
                    ? `+ ${formatCurrency(current.house.rentAmount)} Rent`
                    : "(Rent-free)"}
                </p>
              </div>
            </div>

            {/* KPI 3: Net Monthly Balance */}
            <div className="rounded-[16px] border border-[#e4e9f2] bg-white p-5 shadow-[0px_1px_2px_0px_rgba(12,42,91,0.04),0px_2px_6px_0px_rgba(12,42,91,0.05)] dark:border-border dark:bg-card">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold tracking-wider text-[#5b6678] uppercase dark:text-muted-foreground">
                    Net Monthly Balance
                  </span>
                  <div
                    className={`flex size-[36px] items-center justify-center rounded-full ${
                      netBalance >= 0
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {netBalance >= 0 ? (
                      <TrendingUp className="size-5" />
                    ) : (
                      <TrendingDown className="size-5" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-[26px] font-extrabold tracking-tight ${
                      netBalance < 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {formatCurrency(netBalance)}
                  </span>
                  <Badge
                    variant="outline"
                    className={`rounded-full px-[10px] py-[3px] text-[11px] font-bold ${
                      netBalance >= 0
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    {netBalance >= 0 ? "Surplus" : "Deficit"}
                  </Badge>
                </div>
                <p className="text-[12px] text-[#5b6678] dark:text-muted-foreground">
                  {netBalance >= 0
                    ? "✓ Family income covers declared monthly expenses"
                    : "⚠ Declared expenses exceed total monthly income"}
                </p>
              </div>
            </div>
          </div>

          {/* 2-Column Split: Living Expenses Card & Family Income Card with Equal Height */}
          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            <ExpensesCard
              house={current.house}
              lightSource={current.lightSource}
              lightAmount={current.lightAmount}
              waterSource={current.waterSource}
              waterAmount={current.waterAmount}
              expenses={current.expenses}
              total={current.total}
            />
            <IncomeCard
              income={current.income}
              onUpdate={canUpdate ? handleOpenEdit : undefined}
            />
          </div>

          {/* History Trend Card */}
          <TrendCard history={data?.history || []} />
        </>
      ) : (
        <div className="space-y-4 rounded-[16px] border border-dashed border-[#cfd7e4] bg-white p-12 text-center shadow-xs dark:border-border dark:bg-card">
          <div className="mx-auto flex size-[52px] items-center justify-center rounded-full bg-[#edf3fe] text-[#1f5fd6]">
            <Wallet className="size-6" />
          </div>
          <div className="mx-auto max-w-md space-y-1.5">
            <h3 className="text-[16px] font-bold text-[#0c2a5b] dark:text-foreground">
              No List of Expenses Recorded
            </h3>
            <p className="text-[13px] text-[#5b6678] dark:text-muted-foreground">
              An expense and living condition evaluation has not been recorded
              for {patient.fullName} yet.
            </p>
          </div>
          {canCreate && (
            <Button
              size="lg"
              disabled={!canPerformActions}
              title={!canPerformActions ? reason : undefined}
              onClick={handleOpenCreate}
              className="h-[38px] cursor-pointer gap-2 rounded-full bg-[#1f5fd6] px-5 text-[13px] font-semibold text-white shadow-[0px_6px_7px_rgba(31,95,214,0.25)] transition-all hover:bg-[#1a53bd] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="size-4" />
              <span>Record List of Expenses</span>
            </Button>
          )}
        </div>
      )}

      {/* Create / Edit Dialog (Modal unchanged) */}
      <ProfileFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        patientId={patientId}
        initialProfile={isEditing ? current : null}
        liveIncome={data?.liveIncome}
      />

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => !open && setIsDeleteDialogOpen(false)}
      >
        <AlertDialogContent className="rounded-[20px] p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[18px] font-bold text-[#0c2a5b] dark:text-foreground">
              Delete Expense Record
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-1 text-[13px] text-[#5b6678] dark:text-muted-foreground">
              Are you sure you want to delete this living and expense record?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="h-[36px] rounded-full border-[#cfd7e4] px-4 text-[13px] font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCurrent}
              disabled={deleteMutation.isPending}
              className="h-[36px] cursor-pointer rounded-full bg-destructive px-5 text-[13px] font-bold text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Record"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
