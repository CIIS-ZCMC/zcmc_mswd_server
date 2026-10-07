import React, { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { BookOpen, Info } from "lucide-react"
import { usePermission } from "@/features/auth/hooks/use-permission"
import {
  useAssistantTypes,
  useCreateAssistantType,
  useCreateFundSource,
  useCreateGuarantor,
  useCreateModeOfAssistance,
  useDeleteAssistantType,
  useDeleteFundSource,
  useDeleteGuarantor,
  useDeleteModeOfAssistance,
  useFundSources,
  useGuarantors,
  useModeOfAssistances,
  useUpdateAssistantType,
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
import { LIBRARY_TABS, getTabConfig } from "../lib/library-tabs"

export const LibraryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LibraryTabKey>("guarantors")

  const canManageLibrary = usePermission("library.manage")
  const canManageGuarantees = usePermission("guarantee.create")

  // Guarantors
  const { data: guarantors = [], isLoading: guarantorsLoading } =
    useGuarantors(false)
  const createGuarantorMut = useCreateGuarantor()
  const updateGuarantorMut = useUpdateGuarantor()
  const deleteGuarantorMut = useDeleteGuarantor()

  // Types of Assistance
  const { data: assistantTypes = [], isLoading: assistantTypesLoading } =
    useAssistantTypes(false)
  const createAssistantTypeMut = useCreateAssistantType()
  const updateAssistantTypeMut = useUpdateAssistantType()
  const deleteAssistantTypeMut = useDeleteAssistantType()

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

  // Assistance Sources (Legacy tab being merged into Fund Sources)
  const { data: assistanceSources = [], isLoading: assistanceSourcesLoading } =
    useAssistanceSources(false)
  const createAssistanceSourceMut = useCreateAssistanceSource()
  const updateAssistanceSourceMut = useUpdateAssistanceSource()
  const deleteAssistanceSourceMut = useDeleteAssistanceSource()

  const getTabCount = (key: LibraryTabKey) => {
    switch (key) {
      case "guarantors":
        return guarantors.length
      case "assistance-types":
        return assistantTypes.length
      case "mode-of-assistance":
        return modes.length
      case "fund-sources":
        return fundSources.length
      case "assistance-sources":
        return assistanceSources.length
    }
  }

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
              Manage system lookups, types of assistance, modes of assistance,
              fund sources, and guarantor master lists.
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
          {/* Tabs Navigation */}
          <TabsList className="h-auto flex-wrap gap-1.5 rounded-xl border border-border/70 bg-muted/40 p-1.5">
            {LIBRARY_TABS.map((tab) => {
              const TabIcon = tab.icon
              const count = getTabCount(tab.key)
              return (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="gap-2.5 rounded-lg px-4 py-2.5 text-sm font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                >
                  <TabIcon className="size-4" />
                  {tab.label} ({count})
                </TabsTrigger>
              )
            })}
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
              tabConfig={getTabConfig("guarantors")}
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

          {/* Types of Assistance Tab */}
          <TabsContent
            value="assistance-types"
            className="mt-0 space-y-4 focus-visible:outline-hidden"
          >
            <Alert className="border-primary/20 bg-primary/5 text-foreground">
              <Info className="size-5 text-primary" />
              <AlertTitle className="text-sm font-bold">
                About Types of Assistance
              </AlertTitle>
              <AlertDescription className="mt-0.5 text-xs text-muted-foreground">
                Assistance line item types (Medicines, Hospital Bills,
                Laboratory / Diagnostics, Medical Supplies / Devices) used
                across patient assistance records and guarantee breakdowns.
              </AlertDescription>
            </Alert>

            <LookupTable
              tabConfig={getTabConfig("assistance-types")}
              items={assistantTypes}
              isLoading={assistantTypesLoading}
              canManage={canManageLibrary}
              onSave={async (data: LookupFormItem) => {
                if (data.id) {
                  await updateAssistantTypeMut.mutateAsync({
                    id: data.id,
                    input: {
                      name: data.name,
                      code: data.code || "",
                      category: data.category || "medical",
                      description: data.description,
                      isActive: data.isActive,
                    },
                  })
                } else {
                  await createAssistantTypeMut.mutateAsync({
                    name: data.name,
                    code: data.code || "",
                    category: data.category || "medical",
                    description: data.description,
                    isActive: data.isActive,
                  })
                }
              }}
              onDelete={async (id: number) => {
                await deleteAssistantTypeMut.mutateAsync(id)
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
                How assistance is given (e.g. Financial Assistance, Medical
                Assistance, Counseling, Referral), chosen during the intake
                assessment and on guarantee breakdown lines.
              </AlertDescription>
            </Alert>

            <LookupTable
              tabConfig={getTabConfig("mode-of-assistance")}
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
                      sortOrder: data.sortOrder ?? 0,
                      isActive: data.isActive,
                    },
                  })
                } else {
                  await createMode.mutateAsync({
                    name: data.name,
                    code: data.code || "",
                    sortOrder: data.sortOrder ?? 0,
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
                Official funding sources and breakdown allocations (MSWD, City
                Mayor, Congressional, Senatorial, PCSO, Malasakit). Includes
                specify requirements for flexible funds like
                &ldquo;Others&rdquo;.
              </AlertDescription>
            </Alert>

            <LookupTable
              tabConfig={getTabConfig("fund-sources")}
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
                      sortOrder: data.sortOrder ?? 0,
                      requiresSpecify: data.requiresSpecify ?? undefined,
                      isActive: data.isActive,
                    },
                  })
                } else {
                  await createFund.mutateAsync({
                    name: data.name,
                    code: data.code || "",
                    sortOrder: data.sortOrder ?? 0,
                    requiresSpecify: data.requiresSpecify ?? undefined,
                    isActive: data.isActive,
                  })
                }
              }}
              onDelete={async (id: number) => {
                await deleteFund.mutateAsync(id)
              }}
            />
          </TabsContent>

          {/* Assistance Sources Tab (Legacy notice) */}
          <TabsContent
            value="assistance-sources"
            className="mt-0 space-y-4 focus-visible:outline-hidden"
          >
            <Alert className="border-amber-500/30 bg-amber-500/10 text-foreground">
              <Info className="size-5 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-sm font-bold text-amber-800 dark:text-amber-300">
                Notice: Being Merged into Fund Sources
              </AlertTitle>
              <AlertDescription className="mt-0.5 text-xs text-muted-foreground">
                Assistance Sources are being unified with Fund Sources. This tab
                remains temporarily available for backward compatibility with
                existing guarantee records until the guarantee breakdown rewrite
                is active.
              </AlertDescription>
            </Alert>

            <LookupTable
              tabConfig={getTabConfig("assistance-sources")}
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
                      requiresSpecify: data.requiresSpecify ?? undefined,
                      isActive: data.isActive,
                    },
                  })
                } else {
                  await createAssistanceSourceMut.mutateAsync({
                    name: data.name,
                    code: data.code,
                    requiresSpecify: data.requiresSpecify ?? undefined,
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
