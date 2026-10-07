import React, { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { BookOpen, Building, Coins, Info, Sparkles, Wallet } from "lucide-react"
import { usePermission } from "@/features/auth/hooks/use-permission"
import {
  useCreateFundSource,
  useCreateGuarantor,
  useCreateModeOfAssistance,
  useDeleteFundSource,
  useDeleteGuarantor,
  useDeleteModeOfAssistance,
  useFundSources,
  useGuarantors,
  useModeOfAssistances,
  useUpdateFundSource,
  useUpdateGuarantor,
  useUpdateModeOfAssistance,
} from "../hooks/use-library"
import {
  useAssistanceSources,
  useCreateAssistanceSource,
  useDeleteAssistanceSource,
  useUpdateAssistanceSource,
} from "@/features/guarantees/hooks/use-assistance-sources"
import { LookupTable } from "./lookup-table"
import type { LookupFormItem } from "./dialogs/lookup-item-dialog"
import type { LibraryTabKey } from "../types"

export const LibraryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LibraryTabKey>("guarantors")

  const canManageLibrary = usePermission("library.manage")
  const canManageGuarantees = usePermission("guarantee.create")

  // Modes of Assistance
  const { data: modes = [], isLoading: modesLoading } =
    useModeOfAssistances(false)
  const createMode = useCreateModeOfAssistance()
  const updateMode = useUpdateModeOfAssistance()
  const deleteMode = useDeleteModeOfAssistance()

  // Fund Sources
  const { data: fundSources = [], isLoading: fundSourcesLoading } =
    useFundSources(false)
  const createFund = useCreateFundSource()
  const updateFund = useUpdateFundSource()
  const deleteFund = useDeleteFundSource()

  // Guarantors
  const { data: guarantors = [], isLoading: guarantorsLoading } =
    useGuarantors(false)
  const createGuarantorMut = useCreateGuarantor()
  const updateGuarantorMut = useUpdateGuarantor()
  const deleteGuarantorMut = useDeleteGuarantor()

  // Assistance Sources (Guarantor Breakdown Types)
  const { data: assistanceSources = [], isLoading: assistanceSourcesLoading } =
    useAssistanceSources(false)
  const createAssistanceSourceMut = useCreateAssistanceSource()
  const updateAssistanceSourceMut = useUpdateAssistanceSource()
  const deleteAssistanceSourceMut = useDeleteAssistanceSource()

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Top Header */}
      <div className="border-b border-border/80 bg-card/70 px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <BookOpen className="size-6" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
              Library Settings
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Manage system lookups, assessment recommendations, fund sources,
              and guarantor master lists.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as LibraryTabKey)}
          className="space-y-6"
        >
          <TabsList className="h-13 rounded-xl border border-border/70 bg-muted/40 p-1.5">
            <TabsTrigger
              value="guarantors"
              className="gap-2.5 rounded-lg px-4 py-2.5 text-sm font-bold data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <Building className="size-4" />
              Guarantors ({guarantors.length})
            </TabsTrigger>
            <TabsTrigger
              value="mode-of-assistance"
              className="gap-2.5 rounded-lg px-4 py-2.5 text-sm font-bold data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <Sparkles className="size-4" />
              Mode of Assistance ({modes.length})
            </TabsTrigger>
            <TabsTrigger
              value="fund-sources"
              className="gap-2.5 rounded-lg px-4 py-2.5 text-sm font-bold data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <Wallet className="size-4" />
              Fund Sources ({fundSources.length})
            </TabsTrigger>
            <TabsTrigger
              value="assistance-sources"
              className="gap-2.5 rounded-lg px-4 py-2.5 text-sm font-bold data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <Coins className="size-4" />
              Assistance Sources ({assistanceSources.length})
            </TabsTrigger>
          </TabsList>

          {/* Guarantors Tab */}
          <TabsContent
            value="guarantors"
            className="mt-0 space-y-4 focus-visible:outline-hidden"
          >
            <Alert className="border-primary/20 bg-primary/5 text-foreground">
              <Info className="size-5 text-primary" />
              <AlertTitle className="text-sm font-bold">
                About Guarantors
              </AlertTitle>
              <AlertDescription className="mt-0.5 text-xs text-muted-foreground">
                External partner agencies (e.g. MAIFIP, PCSO, DSWD, PhilHealth)
                that provide financial guarantees and hospital bill assistance.
              </AlertDescription>
            </Alert>

            <LookupTable
              type="guarantor"
              title="Guarantors"
              singularTitle="Guarantor"
              description="External guarantee and assistance agencies (MAIFIP, PCSO, DSWD, etc.)"
              items={guarantors}
              isLoading={guarantorsLoading}
              canManage={canManageGuarantees}
              onSave={async (data: LookupFormItem) => {
                if (data.id) {
                  await updateGuarantorMut.mutateAsync({
                    id: data.id,
                    input: {
                      name: data.name,
                      address: data.address,
                      isActive: data.isActive,
                    },
                  })
                } else {
                  await createGuarantorMut.mutateAsync({
                    name: data.name,
                    address: data.address,
                    isActive: data.isActive,
                  })
                }
              }}
              onDelete={async (id: number) => {
                await deleteGuarantorMut.mutateAsync(id)
              }}
            />
          </TabsContent>

          {/* Mode of Assistance Tab */}
          <TabsContent
            value="mode-of-assistance"
            className="mt-0 space-y-4 focus-visible:outline-hidden"
          >
            <Alert className="border-primary/20 bg-primary/5 text-foreground">
              <Info className="size-5 text-primary" />
              <AlertTitle className="text-sm font-bold">
                About Modes of Assistance
              </AlertTitle>
              <AlertDescription className="mt-0.5 text-xs text-muted-foreground">
                Standard assistance recommendation modes (e.g. Financial
                Assistance, Medical Assistance, Counseling) selected during
                social worker intake and printed on UIS Section V.
              </AlertDescription>
            </Alert>

            <LookupTable
              type="mode_of_assistance"
              title="Modes of Assistance"
              singularTitle="Mode of Assistance"
              description="Intake assessment and UIS Section V mode of assistance options."
              items={modes}
              isLoading={modesLoading}
              canManage={canManageLibrary}
              onSave={async (data: LookupFormItem) => {
                if (data.id) {
                  await updateMode.mutateAsync({
                    id: data.id,
                    input: {
                      name: data.name,
                      code: data.code || "",
                      sortOrder: data.sortOrder,
                      isActive: data.isActive,
                    },
                  })
                } else {
                  await createMode.mutateAsync({
                    name: data.name,
                    code: data.code || "",
                    sortOrder: data.sortOrder,
                    isActive: data.isActive,
                  })
                }
              }}
              onDelete={async (id: number) => {
                await deleteMode.mutateAsync(id)
              }}
            />
          </TabsContent>

          {/* Fund Sources Tab */}
          <TabsContent
            value="fund-sources"
            className="mt-0 space-y-4 focus-visible:outline-hidden"
          >
            <Alert className="border-primary/20 bg-primary/5 text-foreground">
              <Info className="size-5 text-primary" />
              <AlertTitle className="text-sm font-bold">
                About Fund Sources
              </AlertTitle>
              <AlertDescription className="mt-0.5 text-xs text-muted-foreground">
                Funding source allocations (e.g. MSWD, MAIP, Malasakit Center,
                PCSO) assigned to recommended assistance on the Unified Intake
                Sheet.
              </AlertDescription>
            </Alert>

            <LookupTable
              type="fund_source"
              title="Fund Sources"
              singularTitle="Fund Source"
              description="Intake assessment and UIS Section V funding source options."
              items={fundSources}
              isLoading={fundSourcesLoading}
              canManage={canManageLibrary}
              onSave={async (data: LookupFormItem) => {
                if (data.id) {
                  await updateFund.mutateAsync({
                    id: data.id,
                    input: {
                      name: data.name,
                      code: data.code || "",
                      sortOrder: data.sortOrder,
                      isActive: data.isActive,
                    },
                  })
                } else {
                  await createFund.mutateAsync({
                    name: data.name,
                    code: data.code || "",
                    sortOrder: data.sortOrder,
                    isActive: data.isActive,
                  })
                }
              }}
              onDelete={async (id: number) => {
                await deleteFund.mutateAsync(id)
              }}
            />
          </TabsContent>

          {/* Assistance Sources Tab */}
          <TabsContent
            value="assistance-sources"
            className="mt-0 space-y-4 focus-visible:outline-hidden"
          >
            <Alert className="border-primary/20 bg-primary/5 text-foreground">
              <Info className="size-5 text-primary" />
              <AlertTitle className="text-sm font-bold">
                About Assistance Sources (Breakdown Types)
              </AlertTitle>
              <AlertDescription className="mt-0.5 text-xs text-muted-foreground">
                Line-item categories (e.g. Medicines, Hospital Bills, Laboratory
                / Diagnostics) used when recording itemized patient guarantee
                breakdowns.
              </AlertDescription>
            </Alert>

            <LookupTable
              type="assistance_source"
              title="Assistance Sources"
              singularTitle="Assistance Source"
              description="Breakdown assistance item types for patient guarantees (Medicines, Hospital Bills, Diagnostics, etc.)."
              items={assistanceSources}
              isLoading={assistanceSourcesLoading}
              canManage={canManageGuarantees}
              onSave={async (data: LookupFormItem) => {
                if (data.id) {
                  await updateAssistanceSourceMut.mutateAsync({
                    id: data.id,
                    input: {
                      name: data.name,
                      code: data.code,
                      requiresSpecify: data.requiresSpecify,
                      isActive: data.isActive,
                    },
                  })
                } else {
                  await createAssistanceSourceMut.mutateAsync({
                    name: data.name,
                    code: data.code,
                    requiresSpecify: data.requiresSpecify,
                    isActive: data.isActive,
                  })
                }
              }}
              onDelete={async (id: number) => {
                await deleteAssistanceSourceMut.mutateAsync(id)
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
