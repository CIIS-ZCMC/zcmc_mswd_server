import React, { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Building, Coins, Sparkles, Wallet } from "lucide-react"
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
      <div className="border-b border-border/80 bg-card/60 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <BookOpen className="size-5" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              Library Settings
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage system lookups, assessment recommendations, fund sources,
              and guarantor master lists.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as LibraryTabKey)}
          className="space-y-6"
        >
          <TabsList className="border border-border/60 bg-muted/40 p-1">
            <TabsTrigger
              value="guarantors"
              className="gap-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <Building className="size-3.5" />
              Guarantors ({guarantors.length})
            </TabsTrigger>
            <TabsTrigger
              value="mode-of-assistance"
              className="gap-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <Sparkles className="size-3.5" />
              Mode of Assistance ({modes.length})
            </TabsTrigger>
            <TabsTrigger
              value="fund-sources"
              className="gap-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <Wallet className="size-3.5" />
              Fund Sources ({fundSources.length})
            </TabsTrigger>
            <TabsTrigger
              value="assistance-sources"
              className="gap-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <Coins className="size-3.5" />
              Assistance Sources ({assistanceSources.length})
            </TabsTrigger>
          </TabsList>

          {/* Guarantors Tab */}
          <TabsContent
            value="guarantors"
            className="mt-0 focus-visible:outline-hidden"
          >
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
            className="mt-0 focus-visible:outline-hidden"
          >
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
            className="mt-0 focus-visible:outline-hidden"
          >
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
            className="mt-0 focus-visible:outline-hidden"
          >
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
