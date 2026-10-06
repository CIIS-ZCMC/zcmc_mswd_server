import React, { useState } from "react"
import { useSearchParams, useNavigate } from "@/lib/inertia-router-hooks"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Building2,
  ClipboardList,
  CreditCard,
  Edit,
  Eye,
  FileSpreadsheet,
  FileText,
  FolderPlus,
  History,
  Printer,
  Receipt,
  User,
  UserCheck,
  Users,
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
import { DocumentsTab } from "./tabs/documents-tab"
import { FamilyTab } from "./tabs/family-tab"
import { HistoryTab } from "./tabs/history-tab"
import { HospitalEncountersTab } from "./tabs/hospital-encounters-tab"
import { IdTab } from "./tabs/id-tab"
import { ProfileTab } from "./tabs/profile-tab"
import { SocialCaseTab } from "./tabs/social-case-tab"
import { CaretakeTab } from "./tabs/caretake-tab"
import { SocioeconomicTab } from "@/features/socioeconomic"
import { UisTab } from "./tabs/uis-tab"
import { WatchersTab } from "./tabs/watchers-tab"

import { WatcherStatusBanner } from "./watcher-status-banner"
import { WatcherWaiverDialog } from "./dialogs/watcher-waiver-dialog"
import { useCaseWatcherMutations } from "@/features/cases/hooks/use-case-watcher-mutations"

interface PatientDetailViewProps {
  patient: PatientRecord
  onUpdatePatient?: (updatedPatient: PatientRecord) => void
}

const PATIENT_TABS = [
  "profile",
  "id",
  "family",
  "socioeconomic",
  "hospital-encounters",
  "uis",
  "social-case",
  "watchers",
  "caretake",
  "documents",
  "history",
]

export const PatientDetailView: React.FC<PatientDetailViewProps> = ({ patient }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const canCreateCase = usePermission("cases.create")

  // An unknown ?tab= (e.g. a bookmarked link to the removed intake-sheet tab)
  // falls back to the profile rather than rendering an empty pane.
  const requestedTab = searchParams.get("tab")
  const activeTab = requestedTab && PATIENT_TABS.includes(requestedTab) ? requestedTab : "profile"
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
  const [isAddFamilyOpen, setIsAddFamilyOpen] = useState(false)
  const [isWaiverOpen, setIsWaiverOpen] = useState(false)
  const [editingFamilyMember, setEditingFamilyMember] = useState<FamilyMember | null>(null)


  const watcherMutations = useCaseWatcherMutations({
    caseId: patient.latestCaseId ?? 0,
    patientId: Number(patient.id),
  })
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

  const handleRevokeWaiver = async () => {
    if (window.confirm("Are you sure you want to revoke the watcher waiver for this admission episode?")) {
      await watcherMutations.destroyWaiver()
    }
  }

  const handleUpdateFamilyMember = (memberId: string, updatedFamily: Omit<FamilyMember, "id">) => {
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
        educational_attainment: updatedFamily.educationalAttainment || undefined,
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar className="size-18 border-2 border-primary/30">
              <AvatarFallback className="bg-primary/15 text-primary font-heading font-bold text-2xl">
                {patient.fullName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-heading text-3xl font-extrabold tracking-tight">
                  {patient.fullName}
                </h1>
                <Badge variant="default" className="text-sm px-3.5 py-1 font-bold">
                  {patient.category}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-base text-muted-foreground mt-2 font-mono">
                <span>
                  Hosp ID:{" "}
                  <strong className="text-foreground font-bold font-mono text-base">
                    {patient.hospitalNo}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  MSWD ID:{" "}
                  <strong className="text-foreground font-bold font-mono text-base">
                    {patient.mswdNo}
                  </strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 font-sans font-semibold text-foreground text-base">
                  <Building2 className="size-5 text-primary" />
                  {patient.ward} ({patient.bedNo})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {canCreateCase && (
              <Button
                variant="default"
                size="default"
                className="gap-2 text-base font-bold h-11 px-4 shadow-sm"
                onClick={() => setIsOpenCaseOpen(true)}
              >
                <FolderPlus className="size-5" />
                Open Case
              </Button>
            )}
            <Button
              variant="outline"
              size="default"
              className="gap-2 text-base font-bold h-11 px-4"
              onClick={() => window.print()}
            >
              <Printer className="size-5" />
              Print Case Study
            </Button>
            <Button
              variant="outline"
              size="default"
              className="gap-2 text-base font-bold h-11 px-4"
            >
              <Edit className="size-5" />
              Edit Status
            </Button>
          </div>
        </div>
      </div>


      {/* Main 8-Tab Workspace */}
      <div className="flex-1 p-6 space-y-6">
        <WatcherStatusBanner
          caseId={patient.latestCaseId}
          onOpenWaiverDialog={() => setIsWaiverOpen(true)}
          onRevokeWaiver={handleRevokeWaiver}
          isRevokingWaiver={watcherMutations.isDestroyingWaiver}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 flex flex-wrap items-center justify-start w-full gap-1.5 group-data-horizontal/tabs:h-auto h-auto p-1.5 bg-muted/60 rounded-xl border border-border/80 shadow-2xs">
            <TabsTrigger
              value="profile"
              className="rounded-lg px-3.5 py-2 h-auto flex-none shrink-0 text-xs sm:text-sm font-bold gap-2 border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all cursor-pointer"
            >
              <User className="size-4" />
              <span>Profile</span>
            </TabsTrigger>

            <TabsTrigger
              value="id"
              className="rounded-lg px-3.5 py-2 h-auto flex-none shrink-0 text-xs sm:text-sm font-bold gap-2 border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all cursor-pointer"
            >
              <CreditCard className="size-4" />
              <span>IDs</span>
            </TabsTrigger>

            <TabsTrigger
              value="family"
              className="rounded-lg px-3.5 py-2 h-auto flex-none shrink-0 text-xs sm:text-sm font-bold gap-2 border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all cursor-pointer"
            >
              <Users className="size-4" />
              <span>Family</span>
              <span className="ml-1 rounded-full bg-background/25 text-current px-2 py-0.2 text-[10px] sm:text-xs font-black">
                {patient.familyMembers.length}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="socioeconomic"
              className="rounded-lg px-3.5 py-2 h-auto flex-none shrink-0 text-xs sm:text-sm font-bold gap-2 border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all cursor-pointer"
            >
              <Receipt className="size-4" />
              <span>List of Expenses</span>
            </TabsTrigger>

            <TabsTrigger
              value="hospital-encounters"
              className="rounded-lg px-3.5 py-2 h-auto flex-none shrink-0 text-xs sm:text-sm font-bold gap-2 border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all cursor-pointer"
            >
              <Building2 className="size-4" />
              <span>Hospital Encounters</span>
            </TabsTrigger>

            <TabsTrigger
              value="uis"
              className="rounded-lg px-3.5 py-2 h-auto flex-none shrink-0 text-xs sm:text-sm font-bold gap-2 border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all cursor-pointer"
            >
              <ClipboardList className="size-4" />
              <span>Unified Intake Sheet (UIS)</span>
            </TabsTrigger>

            <TabsTrigger
              value="social-case"
              className="rounded-lg px-3.5 py-2 h-auto flex-none shrink-0 text-xs sm:text-sm font-bold gap-2 border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="size-4" />
              <span>Social Case</span>
            </TabsTrigger>

            <TabsTrigger
              value="watchers"
              className="rounded-lg px-3.5 py-2 h-auto flex-none shrink-0 text-xs sm:text-sm font-bold gap-2 border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all cursor-pointer"
            >
              <Eye className="size-4" />
              <span>Watchers</span>
              <span className="ml-1 rounded-full bg-background/25 text-current px-2 py-0.2 text-[10px] sm:text-xs font-black">
                {patient.watchers.length}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="caretake"
              className="rounded-lg px-3.5 py-2 h-auto flex-none shrink-0 text-xs sm:text-sm font-bold gap-2 border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all cursor-pointer"
            >
              <UserCheck className="size-4" />
              <span>Caretake</span>
            </TabsTrigger>

            <TabsTrigger
              value="documents"
              className="rounded-lg px-3.5 py-2 h-auto flex-none shrink-0 text-xs sm:text-sm font-bold gap-2 border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all cursor-pointer"
            >
              <FileText className="size-4" />
              <span>Docs</span>
              <span className="ml-1 rounded-full bg-background/25 text-current px-2 py-0.2 text-[10px] sm:text-xs font-black">
                {patient.documents.length}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="history"
              className="rounded-lg px-3.5 py-2 h-auto flex-none shrink-0 text-xs sm:text-sm font-bold gap-2 border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all cursor-pointer"
            >
              <History className="size-4" />
              <span>History</span>
              <span className="ml-1 rounded-full bg-background/25 text-current px-2 py-0.2 text-[10px] sm:text-xs font-black">
                {patient.history.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileTab patient={patient} />
          </TabsContent>

          <TabsContent value="id">
            <IdTab patient={patient} />
          </TabsContent>

          <TabsContent value="family">
            <FamilyTab
              patient={patient}
              onOpenAddFamilyDialog={() => setIsAddFamilyOpen(true)}
              onOpenEditFamilyDialog={(member) => setEditingFamilyMember(member)}
              onDeleteFamilyMember={handleDeleteFamilyMember}
            />
          </TabsContent>

          <TabsContent value="socioeconomic">
            <SocioeconomicTab patient={patient} />
          </TabsContent>

          <TabsContent value="hospital-encounters">
            <HospitalEncountersTab patient={patient} />
          </TabsContent>

          <TabsContent value="uis">
            <UisTab patient={patient} onOpenCaseNeeded={() => setIsOpenCaseOpen(true)} />
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
            <WatchersTab patient={patient} patientId={Number(patient.id)} caseId={patient.latestCaseId} />
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

      <WatcherWaiverDialog
        isOpen={isWaiverOpen}
        onClose={() => setIsWaiverOpen(false)}
        onStoreWaiver={async (payload) => {
          await watcherMutations.storeWaiver(payload)
        }}
        isSubmitting={watcherMutations.isStoringWaiver}
      />

      <OpenCaseDialog
        open={isOpenCaseOpen}
        onOpenChange={setIsOpenCaseOpen}
        patientId={patient.id}
        patientName={patient.fullName}
        hospitalNumber={patient.hospitalNo}
        onCaseOpened={(newCase) => {
          setIsOpenCaseOpen(false)
          if (newCase?.id) {
            navigate(`/cases/${newCase.id}`)
          }
        }}
      />
    </div>
  )
}

