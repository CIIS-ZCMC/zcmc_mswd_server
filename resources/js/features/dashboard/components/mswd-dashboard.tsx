import React, { useEffect, useMemo, useState } from "react"
import { router } from "@inertiajs/react"
import { Plus } from "lucide-react"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { useMyFollowUps } from "@/features/cases/hooks/use-progress-notes"
import { usePendingApprovals } from "@/features/guarantees/hooks/use-approvals"
import { PatientSearchImportDialog } from "@/features/patients/components/dialogs/patient-search-import-dialog"
import { useQueue } from "@/features/queue/hooks/use-queue"
import type { ServiceVisit } from "@/features/queue/types"
import { useTurnaroundReport } from "@/features/reports/hooks/use-turnaround-reports"
import { ServingBar } from "@/features/queue/components/serving-bar"
import { useGuaranteeTotals } from "../hooks/use-dashboard"
import { toDateKey, workingDays } from "../lib/week"
import { DashboardSidebar } from "./dashboard-sidebar"
import { DashboardHeader } from "./dashboard-header"
import {
  DashboardKpiStrip,
  type KpiCardData,
  type KpiSubCard,
} from "./dashboard-kpi-strip"
import { IntakeQueueCard, type IntakeQueueRow } from "./intake-queue-card"
import {
  FurtherAssistanceCard,
  type FurtherAssistanceItem,
} from "./further-assistance-card"
import { AssistanceReleasedCard } from "./assistance-released-card"
import { ReturnedForRevisionCard } from "./returned-for-revision-card"

function initialsOf(name: string): string {
  const parts = name.replace(/,/g, " ").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function arrivedLabel(iso: string, today: Date): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  if (toDateKey(d) === toDateKey(today)) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/** The most common purposes among visits, as KPI sub-cards (at most two). */
function purposeSubCards(
  visits: ServiceVisit[],
  tone: KpiSubCard["tone"]
): KpiSubCard[] {
  const counts = new Map<string, number>()
  for (const v of visits) {
    const key = v.purpose?.trim() || "No purpose"
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([label, n]) => ({ label, value: n, tone }))
}

function minutes(value: number | null | undefined): string {
  return value == null ? "—" : `${Math.round(value)} min`
}

export const MswdDashboard: React.FC = () => {
  const { user } = useAuth()
  const canViewPatients = usePermission("patients.view")
  const canManageQueue = usePermission("queue.manage")
  const canViewCases = usePermission("cases.view")
  const canViewGuarantees = usePermission("guarantee.view")
  const canApprove = usePermission("guarantee.approve")
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false)

  // One clock for the day's figures, read when the page opens.
  const [today] = useState(() => new Date())
  const todayKey = toDateKey(today)

  const queue = useQueue(todayKey, canManageQueue)
  const turnaround = useTurnaroundReport(todayKey, todayKey)
  const followUps = useMyFollowUps()
  const pendingApprovals = usePendingApprovals()

  const thisWeekDays = useMemo(() => workingDays(today, 0), [today])
  const lastWeekDays = useMemo(() => workingDays(today, 1), [today])
  const thisWeek = useGuaranteeTotals(
    toDateKey(thisWeekDays[0] ?? today),
    toDateKey(thisWeekDays[thisWeekDays.length - 1] ?? today)
  )
  const lastWeek = useGuaranteeTotals(
    toDateKey(lastWeekDays[0]),
    toDateKey(lastWeekDays[lastWeekDays.length - 1])
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        if (canViewPatients) {
          setIsSearchDialogOpen((prev) => !prev)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [canViewPatients])

  const firstName = user?.employee_name?.trim().split(/\s+/)[0] ?? "there"

  const waiting = queue.data?.waiting ?? []
  const inProgress = queue.data?.inProgress ?? []
  const completed = queue.data?.completed ?? []

  const queueRows = useMemo<IntakeQueueRow[]>(() => {
    const toRow = (
      v: ServiceVisit,
      category: IntakeQueueRow["category"]
    ): IntakeQueueRow => ({
      id: String(v.id),
      patientId: String(v.patientId),
      initials: initialsOf(v.patient?.name ?? ""),
      name: v.patient?.name ?? "Patient",
      mswdId: v.patient?.mswd_id ?? "—",
      purpose: v.purpose ?? "",
      status: category === "new" ? "Waiting" : "In progress",
      category,
      arrived: arrivedLabel(v.arrivedAt, today),
    })

    return [
      ...waiting.map((v) => toRow(v, "new")),
      ...inProgress.map((v) => toRow(v, "open")),
    ]
  }, [waiting, inProgress, today])

  const followUpItems = useMemo<FurtherAssistanceItem[]>(
    () =>
      (followUps.data ?? []).map((note) => {
        const due = note.followUpOn ? new Date(note.followUpOn) : null
        const overdue = due !== null && toDateKey(due) < todayKey
        const narrative = note.narrative.trim()

        return {
          id: String(note.id),
          patientId:
            note.patientId != null ? String(note.patientId) : undefined,
          patientName: note.patientName ?? note.caseCode ?? "Case",
          description:
            narrative.length > 80 ? `${narrative.slice(0, 77)}...` : narrative,
          dateLabel: due
            ? overdue
              ? `Overdue · ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
              : "Due today"
            : "",
        }
      }),
    [followUps.data, todayKey]
  )

  const kpiCards = useMemo<KpiCardData[]>(() => {
    const cards: KpiCardData[] = []

    if (canManageQueue) {
      const oldest = Math.max(0, ...waiting.map((v) => v.waitingMinutes ?? 0))
      const mine = inProgress.filter((v) => v.servedBy?.id === user?.id).length

      cards.push(
        {
          title: "Waiting",
          value: waiting.length,
          note:
            waiting.length === 0 ? "no one waiting" : `oldest ${oldest} min`,
          iconType: "hourglass",
          subCards: purposeSubCards(waiting, "amber"),
        },
        {
          title: "In progress",
          value: inProgress.length,
          note: "being served",
          iconType: "pending_actions",
          subCards: [
            { label: "Mine", value: mine, tone: "blue" },
            { label: "Others", value: inProgress.length - mine, tone: "teal" },
          ],
        },
        {
          title: "Served today",
          value: completed.length,
          note: "completed",
          iconType: "person_add",
          subCards: purposeSubCards(completed, "teal"),
        }
      )
    }

    const tat = turnaround.data
    if (tat) {
      const total = tat.stages.total
      const pct = total.within_target_pct
      cards.push({
        title: "Average TAT today",
        value: total.count > 0 ? minutes(total.avg) : "—",
        note:
          total.count === 0
            ? "none completed yet"
            : pct === null
              ? "no target set"
              : `${Math.round(pct)}% within target`,
        iconType: pct !== null && pct < 50 ? "revision" : "timer",
        subCards: [
          {
            label: "Waiting",
            value: minutes(tat.stages.waiting.avg),
            tone: "amber",
          },
          {
            label: "Processing",
            value: minutes(tat.stages.processing.avg),
            tone: "blue",
          },
        ],
      })
    }

    return cards
  }, [
    canManageQueue,
    waiting,
    inProgress,
    completed,
    turnaround.data,
    user?.id,
  ])

  const summaryLine = [
    canManageQueue
      ? `${waiting.length} waiting · ${inProgress.length} being served`
      : null,
    canApprove && pendingApprovals.data
      ? `${pendingApprovals.data.count} waiting for approval`
      : null,
  ]
    .filter(Boolean)
    .join(" · ")

  const openPatient = (patientId?: string) => {
    if (patientId) {
      router.visit(`/patients/${patientId}`)
      return
    }
    if (canViewPatients) {
      setIsSearchDialogOpen(true)
    }
  }

  return (
    <div
      data-node-id="144:1428"
      className="flex h-screen w-full overflow-hidden bg-[#f4f7fc] font-sans text-[#0c2a5b]"
    >
      {/* Left Navigation Sidebar */}
      <DashboardSidebar />

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <DashboardHeader
          onOpenSearch={() => {
            if (canViewPatients) {
              setIsSearchDialogOpen(true)
            }
          }}
          dateLabel={today.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        />

        <ServingBar />

        {/* Scrollable Dashboard Content */}
        <main className="flex-1 overflow-y-auto px-[24px] py-[28px] lg:px-[36px]">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-[24px]">
            {/* Welcome Banner & New Intake CTA */}
            <div
              data-node-id="144:1479"
              className="flex flex-wrap items-end justify-between gap-4"
            >
              <div className="flex flex-col gap-[4px]">
                <h1 className="text-[30px] leading-[36px] font-bold tracking-[-0.6px] text-[#0c2a5b]">
                  Welcome back, {firstName}
                </h1>
                <p className="text-[14px] leading-normal font-normal text-[#5b6678]">
                  {summaryLine || "Here is your day at a glance."}
                </p>
              </div>

              {canViewPatients && (
                <button
                  type="button"
                  onClick={() => setIsSearchDialogOpen(true)}
                  className="flex h-[44px] shrink-0 cursor-pointer items-center gap-[8px] rounded-full bg-[#1f5fd6] px-[20px] text-[13.5px] font-semibold text-white shadow-[0px_8px_9px_-6px_rgba(31,95,214,0.28)] transition-colors hover:bg-[#1950b8]"
                >
                  <Plus className="size-[18px] stroke-[2.5]" />
                  <span>New intake</span>
                </button>
              )}
            </div>

            {/* KPI strip: only the figures this user may see */}
            <DashboardKpiStrip cards={kpiCards} />

            {/* 2-Column Main Grid */}
            <div className="grid grid-cols-1 items-start gap-[20px] xl:grid-cols-[1.4fr_1fr]">
              <div className="flex flex-col gap-[20px]">
                {canManageQueue && (
                  <IntakeQueueCard
                    rows={queueRows}
                    isLoading={queue.isLoading}
                    onRowClick={(row) => openPatient(row.patientId)}
                  />
                )}
                {canViewCases && (
                  <FurtherAssistanceCard
                    items={followUpItems}
                    onItemClick={(item) => openPatient(item.patientId)}
                  />
                )}
              </div>

              <div className="flex flex-col gap-[20px]">
                {canViewGuarantees && (
                  <AssistanceReleasedCard
                    today={today}
                    thisWeek={thisWeek.data}
                    lastWeek={lastWeek.data}
                    isLoading={thisWeek.isLoading || lastWeek.isLoading}
                  />
                )}
                <ReturnedForRevisionCard />
              </div>
            </div>
          </div>
        </main>
      </div>

      {canViewPatients && (
        <PatientSearchImportDialog
          isOpen={isSearchDialogOpen}
          onClose={() => setIsSearchDialogOpen(false)}
        />
      )}
    </div>
  )
}
