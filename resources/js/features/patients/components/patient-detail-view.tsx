import React, { useMemo, useState } from "react"
import { useSearchParams, useNavigate } from "@/lib/inertia-router-hooks"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Building2,
  ClipboardList,
  Clock,
  CreditCard,
  Eye,
  FileSpreadsheet,
  FileText,
  History,
  Receipt,
  User,
  UserCheck,
} from "lucide-react"
import { usePermission } from "@/features/auth/hooks/use-permission"
import {
  useAddFamilyMember,
  useDeleteFamilyMember,
  useUpdateFamilyMember,
} from "../hooks/use-patient-writes"
import type { FamilyMember, PatientRecord } from "../types"
import { FamilyMemberDialog } from "./dialogs/family-member-dialog"
import { OpenCaseDialog } from "@/features/cases/components/dialogs/open-case-dialog"
import { PatientQueueDialog } from "./dialogs/patient-queue-dialog"
import { PatientActiveQueueStatusDialog } from "./dialogs/patient-active-queue-status-dialog"
import { usePatientVisits } from "@/features/queue"
import { DocumentsTab } from "./tabs/documents-tab"
import { HistoryTab } from "./tabs/history-tab"
import { HospitalEncountersTab } from "./tabs/hospital-encounters-tab"
import { IdTab } from "./tabs/id-tab"
import { ProfileTab } from "./tabs/profile-tab"
import { SocialCaseTab } from "./tabs/social-case-tab"
import { CaretakeTab } from "./tabs/caretake-tab"
import { SocioeconomicTab } from "@/features/socioeconomic"
import { UisTab } from "./tabs/uis-tab"
import { WatchersTab } from "./tabs/watchers-tab"

import { CaseWatcherRequirement } from "./case-watcher-requirement"

interface PatientDetailViewProps {
  patient: PatientRecord
  onUpdatePatient?: (updatedPatient: PatientRecord) => void
}

const PATIENT_TABS = [
  "profile",
  "id",
  "socioeconomic",
  "hospital-encounters",
  "uis",
  "social-case",
  "watchers",
  "caretake",
  "documents",
  "history",
]

export const PatientDetailView: React.FC<PatientDetailViewProps> = ({
  patient,
}) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // An unknown ?tab= (e.g. a bookmarked link to the removed intake-sheet tab)
  // falls back to the profile rather than rendering an empty pane.
  const requestedTab = searchParams.get("tab")
  const activeTab =
    requestedTab && PATIENT_TABS.includes(requestedTab)
      ? requestedTab
      : "profile"
  const setActiveTab = (tab: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set("tab", tab)
        return next
      },
      { replace: true }
    )
  }

  const [isOpenCaseOpen, setIsOpenCaseOpen] = useState(false)
  // The encounter to open the case on (from a UIS row), if any.
  const [openCaseTransactionId, setOpenCaseTransactionId] = useState<
    number | undefined
  >(undefined)
  const [isAddFamilyOpen, setIsAddFamilyOpen] = useState(false)
  const [editingFamilyMember, setEditingFamilyMember] =
    useState<FamilyMember | null>(null)
  const [isQueueDialogOpen, setIsQueueDialogOpen] = useState(false)
  const [isActiveQueueStatusOpen, setIsActiveQueueStatusOpen] = useState(false)

  const canManageQueue = usePermission("queue.manage")

  const { data: visits = [] } = usePatientVisits(
    patient.id,
    undefined,
    canManageQueue
  )
  const activeVisit = useMemo(
    () =>
      visits.find(
        (v) => v.status === "waiting" || v.status === "in_progress"
      ) ?? null,
    [visits]
  )

  const addFamilyMember = useAddFamilyMember(patient.id)
  const updateFamilyMember = useUpdateFamilyMember(patient.id)
  const deleteFamilyMember = useDeleteFamilyMember(patient.id)

  const handleAddFamilyMember = (newFamily: Omit<FamilyMember, "id">) => {
    addFamilyMember.mutate({
      name: newFamily.fullName,
      relationship: newFamily.relationship,
      birthdate: newFamily.birthdate || undefined,
      sex: newFamily.sex || undefined,
      civil_status: newFamily.civilStatus || undefined,
      age: newFamily.age,
      occupation: newFamily.occupation,
      monthly_income: newFamily.monthlyIncome,
      educational_attainment: newFamily.educationalAttainment || undefined,
      contact_number: newFamily.contactNumber || undefined,
      is_living_with_patient: newFamily.isLivingWithPatient,
    })
  }

  const handleUpdateFamilyMember = (
    memberId: string,
    updatedFamily: Omit<FamilyMember, "id">
  ) => {
    updateFamilyMember.mutate({
      memberId,
      payload: {
        name: updatedFamily.fullName,
        relationship: updatedFamily.relationship,
        birthdate: updatedFamily.birthdate || undefined,
        sex: updatedFamily.sex || undefined,
        civil_status: updatedFamily.civilStatus || undefined,
        age: updatedFamily.age,
        occupation: updatedFamily.occupation,
        monthly_income: updatedFamily.monthlyIncome,
        educational_attainment:
          updatedFamily.educationalAttainment || undefined,
        contact_number: updatedFamily.contactNumber || undefined,
        is_living_with_patient: updatedFamily.isLivingWithPatient,
      },
    })
  }

  const handleDeleteFamilyMember = (memberId: string) => {
    deleteFamilyMember.mutate(memberId)
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background text-foreground transition-colors duration-200">
      {/* Patient Header Banner */}
      <div className="border-b border-border bg-card p-6 shadow-2xs">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <Avatar className="size-18 border-2 border-primary/30">
              <AvatarFallback className="bg-primary/15 font-heading text-2xl font-bold text-primary">
                {patient.fullName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-heading text-3xl font-extrabold tracking-tight">
                  {patient.fullName}
                </h1>
                <Badge
                  variant="default"
                  className="px-3.5 py-1 text-sm font-bold"
                >
                  {patient.category}
                </Badge>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-base text-muted-foreground">
                <span>
                  Hosp ID:{" "}
                  <strong className="font-mono text-base font-bold text-foreground">
                    {patient.hospitalNo}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  MSWD ID:{" "}
                  <strong className="font-mono text-base font-bold text-foreground">
                    {patient.mswdNo}
                  </strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 font-sans text-base font-semibold text-foreground">
                  <Building2 className="size-5 text-primary" />
                  {patient.ward} ({patient.bedNo})
                </span>
              </div>
            </div>
          </div>

          {canManageQueue && (
            <div className="flex items-center gap-3">
              {activeVisit ? (
                <Button
                  variant="outline"
                  size="default"
                  className="h-11 gap-2.5 border-amber-500/40 bg-amber-500/10 px-4 text-base font-bold text-amber-600 shadow-sm transition-all hover:bg-amber-500/20 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-500/20"
                  onClick={() => setIsActiveQueueStatusOpen(true)}
                >
                  <span className="size-2.5 animate-pulse rounded-full bg-amber-500" />
                  <Clock className="size-5" />
                  <span>In Queue</span>
                  <Badge
                    variant="outline"
                    className="ml-1 border-amber-500/40 text-xs font-bold text-amber-600 dark:text-amber-400"
                  >
                    {activeVisit.status === "in_progress"
                      ? "Serving"
                      : "Waiting"}
                  </Badge>
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="default"
                  className="h-11 gap-2 px-4 text-base font-bold shadow-sm"
                  onClick={() => setIsQueueDialogOpen(true)}
                >
                  <Clock className="size-5" />
                  Queue Patient
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main 8-Tab Workspace */}
      <div className="flex-1 space-y-6 p-6">
        {patient.openCases.map((openCase) => (
          <CaseWatcherRequirement
            key={openCase.id}
            caseId={openCase.id}
            patientId={Number(patient.id)}
            caseCode={patient.openCases.length > 1 ? openCase.caseCode : undefined}
          />
        ))}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 flex h-auto w-full flex-wrap items-center justify-start gap-1.5 rounded-xl border border-border/80 bg-muted/60 p-1.5 shadow-2xs group-data-horizontal/tabs:h-auto">
            <TabsTrigger
              value="profile"
              className="h-auto flex-none shrink-0 cursor-pointer gap-2 rounded-lg border border-transparent px-3.5 py-2 text-xs font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs sm:text-sm"
            >
              <User className="size-4" />
              <span>Profile</span>
            </TabsTrigger>

            <TabsTrigger
              value="id"
              className="h-auto flex-none shrink-0 cursor-pointer gap-2 rounded-lg border border-transparent px-3.5 py-2 text-xs font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs sm:text-sm"
            >
              <CreditCard className="size-4" />
              <span>IDs</span>
            </TabsTrigger>

            <TabsTrigger
              value="socioeconomic"
              className="h-auto flex-none shrink-0 cursor-pointer gap-2 rounded-lg border border-transparent px-3.5 py-2 text-xs font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs sm:text-sm"
            >
              <Receipt className="size-4" />
              <span>List of Expenses</span>
            </TabsTrigger>

            <TabsTrigger
              value="hospital-encounters"
              className="h-auto flex-none shrink-0 cursor-pointer gap-2 rounded-lg border border-transparent px-3.5 py-2 text-xs font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs sm:text-sm"
            >
              <Building2 className="size-4" />
              <span>Hospital Encounters</span>
            </TabsTrigger>

            <TabsTrigger
              value="uis"
              className="h-auto flex-none shrink-0 cursor-pointer gap-2 rounded-lg border border-transparent px-3.5 py-2 text-xs font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs sm:text-sm"
            >
              <ClipboardList className="size-4" />
              <span>Unified Intake Sheet (UIS)</span>
            </TabsTrigger>

            <TabsTrigger
              value="social-case"
              className="h-auto flex-none shrink-0 cursor-pointer gap-2 rounded-lg border border-transparent px-3.5 py-2 text-xs font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs sm:text-sm"
            >
              <FileSpreadsheet className="size-4" />
              <span>Social Case</span>
            </TabsTrigger>

            <TabsTrigger
              value="watchers"
              className="h-auto flex-none shrink-0 cursor-pointer gap-2 rounded-lg border border-transparent px-3.5 py-2 text-xs font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs sm:text-sm"
            >
              <Eye className="size-4" />
              <span>Watchers</span>
              <span className="py-0.2 ml-1 rounded-full bg-background/25 px-2 text-[10px] font-black text-current sm:text-xs">
                {patient.watchers.length}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="caretake"
              className="h-auto flex-none shrink-0 cursor-pointer gap-2 rounded-lg border border-transparent px-3.5 py-2 text-xs font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs sm:text-sm"
            >
              <UserCheck className="size-4" />
              <span>Caretake</span>
            </TabsTrigger>

            <TabsTrigger
              value="documents"
              className="h-auto flex-none shrink-0 cursor-pointer gap-2 rounded-lg border border-transparent px-3.5 py-2 text-xs font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs sm:text-sm"
            >
              <FileText className="size-4" />
              <span>Docs</span>
              <span className="py-0.2 ml-1 rounded-full bg-background/25 px-2 text-[10px] font-black text-current sm:text-xs">
                {patient.documents.length}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="history"
              className="h-auto flex-none shrink-0 cursor-pointer gap-2 rounded-lg border border-transparent px-3.5 py-2 text-xs font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs sm:text-sm"
            >
              <History className="size-4" />
              <span>History</span>
              <span className="py-0.2 ml-1 rounded-full bg-background/25 px-2 text-[10px] font-black text-current sm:text-xs">
                {patient.history.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileTab
              patient={patient}
              onOpenAddFamilyDialog={() => setIsAddFamilyOpen(true)}
              onOpenEditFamilyDialog={(member) =>
                setEditingFamilyMember(member)
              }
              onDeleteFamilyMember={handleDeleteFamilyMember}
            />
          </TabsContent>

          <TabsContent value="id">
            <IdTab patient={patient} />
          </TabsContent>

          <TabsContent value="socioeconomic">
            <SocioeconomicTab patient={patient} />
          </TabsContent>

          <TabsContent value="hospital-encounters">
            <HospitalEncountersTab patient={patient} />
          </TabsContent>

          <TabsContent value="uis">
            <UisTab
              patient={patient}
              onOpenCaseNeeded={(transactionId) => {
                setOpenCaseTransactionId(transactionId ?? undefined)
                setIsOpenCaseOpen(true)
              }}
            />
          </TabsContent>

          <TabsContent value="social-case">
            <SocialCaseTab
              caseId={patient.latestCaseId}
              patientId={Number(patient.id)}
              patientName={patient.fullName}
              showCaseContext={true}
            />
          </TabsContent>

          <TabsContent value="watchers">
            <WatchersTab
              patient={patient}
              patientId={Number(patient.id)}
              openCases={patient.openCases}
            />
          </TabsContent>

          <TabsContent value="caretake">
            <CaretakeTab patient={patient} />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTab patient={patient} />
          </TabsContent>

          <TabsContent value="history">
            <HistoryTab patient={patient} />
          </TabsContent>
        </Tabs>
      </div>

      <FamilyMemberDialog
        isOpen={isAddFamilyOpen || editingFamilyMember !== null}
        initialMember={editingFamilyMember}
        onClose={() => {
          setIsAddFamilyOpen(false)
          setEditingFamilyMember(null)
        }}
        onAddFamilyMember={handleAddFamilyMember}
        onUpdateFamilyMember={handleUpdateFamilyMember}
      />

      <OpenCaseDialog
        open={isOpenCaseOpen}
        onOpenChange={setIsOpenCaseOpen}
        patientId={patient.id}
        patientName={patient.fullName}
        hospitalNumber={patient.hospitalNo}
        transactionId={openCaseTransactionId}
        onCaseOpened={(newCase) => {
          setIsOpenCaseOpen(false)
          if (newCase?.id) {
            navigate(`/cases/${newCase.id}`)
          }
        }}
      />

      <PatientQueueDialog
        open={isQueueDialogOpen}
        onOpenChange={setIsQueueDialogOpen}
        patient={patient}
      />

      <PatientActiveQueueStatusDialog
        open={isActiveQueueStatusOpen}
        onOpenChange={setIsActiveQueueStatusOpen}
        patient={patient}
        activeVisit={activeVisit}
      />
    </div>
  )
}
