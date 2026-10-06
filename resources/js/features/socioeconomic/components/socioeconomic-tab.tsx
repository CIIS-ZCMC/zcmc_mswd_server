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
import { Card, CardContent } from "@/components/ui/card"
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

export const SocioeconomicTab: React.FC<SocioeconomicTabProps> = ({ patient }) => {
  const patientId = patient.id
  const canView = usePermission("socioeconomic.view")
  const canCreate = usePermission("socioeconomic.create")
  const canUpdate = usePermission("socioeconomic.update")
  const canDelete = usePermission("socioeconomic.delete")

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useSocioeconomic(patientId)

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
      <div className="rounded-2xl border border-dashed p-10 text-center bg-card/40">
        <Receipt className="size-12 text-muted-foreground/50 mx-auto mb-3" />
        <h3 className="text-base font-bold text-foreground">Access Restricted</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
          You do not have permission to view patient expense and living evaluation records.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
        <AlertTitle className="text-base font-bold">Failed to load expense records</AlertTitle>
        <AlertDescription className="text-sm mt-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span>{(error as Error)?.message || "An unexpected network or server error occurred."}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 text-xs font-semibold gap-1.5 shrink-0 bg-background hover:bg-muted cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Retry</span>
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  const current = data?.current
  const totalIncome = current?.income.totalFamilyIncome ?? 0
  const totalExpenses = current?.total ?? 0
  const netBalance = current?.income.balance ?? (totalIncome - totalExpenses)

  return (
    <div className="space-y-5 pb-8">
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

          {/* Senior-Friendly 3 Large Top KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* KPI 1: Total Family Income */}
            <Card className="shadow-xs border rounded-2xl bg-card">
              <CardContent className="p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Total Family Income
                  </span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <PiggyBank className="size-5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  {formatCurrency(totalIncome)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Patient ({formatCurrency(current.income.patientIncome)}) + declared members
                </p>
              </CardContent>
            </Card>

            {/* KPI 2: Total Monthly Expenses */}
            <Card className="shadow-xs border rounded-2xl bg-card">
              <CardContent className="p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Total Monthly Expenses
                  </span>
                  <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    <Receipt className="size-5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  {formatCurrency(totalExpenses)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Living costs {current.house.rentAmount ? `+ ${formatCurrency(current.house.rentAmount)} Rent` : "(Rent-free)"}
                </p>
              </CardContent>
            </Card>

            {/* KPI 3: Net Monthly Balance */}
            <Card className="shadow-xs border rounded-2xl bg-card">
              <CardContent className="p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Net Monthly Balance
                  </span>
                  <div className={`p-2 rounded-xl ${
                    netBalance >= 0
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  }`}>
                    {netBalance >= 0 ? <TrendingUp className="size-5" /> : <TrendingDown className="size-5" />}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                    netBalance < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                  }`}>
                    {formatCurrency(netBalance)}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      netBalance >= 0
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                    }`}
                  >
                    {netBalance >= 0 ? "Surplus" : "Deficit"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {netBalance >= 0
                    ? "✓ Family income covers declared monthly expenses"
                    : "⚠ Declared expenses exceed total monthly income"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 2-Column Split: Living Expenses Card & Family Income Card with Equal Height */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            <ExpensesCard
              house={current.house}
              lightSource={current.lightSource}
              waterSource={current.waterSource}
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
        <div className="rounded-2xl border border-dashed p-12 text-center bg-card/40 space-y-4">
          <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
            <Wallet className="size-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-foreground">No List of Expenses Recorded</h3>
            <p className="text-sm text-muted-foreground">
              An expense and living condition evaluation has not been recorded for {patient.fullName} yet.
            </p>
          </div>
          {canCreate && (
            <Button
              size="lg"
              onClick={handleOpenCreate}
              className="h-10 gap-2 text-sm font-bold cursor-pointer shadow-sm"
            >
              <Plus className="size-4.5" />
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
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Delete Expense Record</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground mt-1">
              Are you sure you want to delete this living and expense record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="text-sm font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCurrent}
              disabled={deleteMutation.isPending}
              className="text-sm font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Record"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
