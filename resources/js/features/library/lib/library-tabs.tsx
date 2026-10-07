import React from "react"
import type { LibraryTabKey } from "../types"
import {
  Building2,
  DollarSign,
  HeartHandshake,
  Layers,
} from "lucide-react"

export interface AssistantTypeCategoryOption {
  value: string
  label: string
  badgeClass: string
}

export const ASSISTANT_TYPE_CATEGORIES: AssistantTypeCategoryOption[] = [
  {
    value: "medical",
    label: "Medical",
    badgeClass:
      "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  },
  {
    value: "financial",
    label: "Financial",
    badgeClass:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  {
    value: "food",
    label: "Food",
    badgeClass:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  {
    value: "transportation",
    label: "Transportation",
    badgeClass:
      "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30",
  },
  {
    value: "burial",
    label: "Burial",
    badgeClass:
      "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
  },
  {
    value: "others",
    label: "Others",
    badgeClass:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30",
  },
]

export function getCategoryConfig(
  category: string
): AssistantTypeCategoryOption {
  const match = ASSISTANT_TYPE_CATEGORIES.find(
    (c) => c.value.toLowerCase() === category.toLowerCase()
  )
  return (
    match ?? {
      value: category,
      label: category.charAt(0).toUpperCase() + category.slice(1),
      badgeClass: "bg-muted text-muted-foreground border-border",
    }
  )
}

export interface LibraryTabDefinition {
  key: LibraryTabKey
  label: string
  singularLabel: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  writePermission: string
  defaultSort: "name" | "sortOrder"
  showCode: boolean
  showSortOrder: boolean
  showCategory: boolean
  showAddress: boolean
  showRequiresSpecify: boolean
  showUsageCount: boolean
}

export const LIBRARY_TABS: LibraryTabDefinition[] = [
  {
    key: "guarantors",
    label: "Guarantors",
    singularLabel: "Guarantor",
    description:
      "External partner agencies and guarantee providers (MAIFIP, PCSO, DSWD, PhilHealth).",
    icon: Building2,
    writePermission: "guarantee.create",
    defaultSort: "name",
    showCode: false,
    showSortOrder: false,
    showCategory: false,
    showAddress: true,
    showRequiresSpecify: false,
    showUsageCount: true,
  },
  {
    key: "assistance-types",
    label: "Types of Assistance",
    singularLabel: "Type of Assistance",
    description:
      "Categories and items of assistance provided to patients (Medicines, Hospital Bills, Diagnostics).",
    icon: Layers,
    writePermission: "library.manage",
    defaultSort: "name",
    showCode: true,
    showSortOrder: false,
    showCategory: true,
    showAddress: false,
    showRequiresSpecify: false,
    showUsageCount: true,
  },
  {
    key: "mode-of-assistance",
    label: "Mode of Assistance",
    singularLabel: "Mode of Assistance",
    description:
      "How assistance is given (e.g. Financial Assistance, Medical Assistance, Counseling, Referral).",
    icon: HeartHandshake,
    writePermission: "library.manage",
    defaultSort: "sortOrder",
    showCode: true,
    showSortOrder: true,
    showCategory: false,
    showAddress: false,
    showRequiresSpecify: false,
    showUsageCount: true,
  },
  {
    key: "fund-sources",
    label: "Fund Sources",
    singularLabel: "Fund Source",
    description:
      "Official funding sources and breakdown allocations (MSWD, City Mayor, Congressional, PCSO).",
    icon: DollarSign,
    writePermission: "library.manage",
    defaultSort: "sortOrder",
    showCode: true,
    showSortOrder: true,
    showCategory: false,
    showAddress: false,
    showRequiresSpecify: true,
    showUsageCount: true,
  },
]

export function getTabConfig(key: LibraryTabKey): LibraryTabDefinition {
  const found = LIBRARY_TABS.find((t) => t.key === key)
  if (!found) {
    return LIBRARY_TABS[0]
  }
  return found
}
