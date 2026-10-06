import type { CaseCardColor } from "../types/case.types"

export interface CardColorConfig {
  color: CaseCardColor
  label: string
  badgeClass: string
  borderClass: string
  bgAccentClass: string
  dotClass: string
}

export const CARD_COLORS: Record<CaseCardColor, CardColorConfig> = {
  white: {
    color: "white",
    label: "White Card (Standard)",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
    borderClass: "border-l-slate-400",
    bgAccentClass: "bg-slate-500/10",
    dotClass: "bg-slate-400",
  },
  green: {
    color: "green",
    label: "Green Card (Indigent)",
    badgeClass: "bg-emerald-500/15 text-emerald-700 border-emerald-500/40 dark:text-emerald-300",
    borderClass: "border-l-emerald-500",
    bgAccentClass: "bg-emerald-500/10",
    dotClass: "bg-emerald-500",
  },
  orange: {
    color: "orange",
    label: "Orange Card (Urgent)",
    badgeClass: "bg-amber-500/15 text-amber-800 border-amber-500/40 dark:text-amber-300",
    borderClass: "border-l-amber-500",
    bgAccentClass: "bg-amber-500/10",
    dotClass: "bg-amber-500",
  },
  pink: {
    color: "pink",
    label: "Pink Card (Critical)",
    badgeClass: "bg-pink-500/15 text-pink-700 border-pink-500/40 dark:text-pink-300",
    borderClass: "border-l-pink-500",
    bgAccentClass: "bg-pink-500/10",
    dotClass: "bg-pink-500",
  },
}

export function getCardColorConfig(color?: CaseCardColor | null): CardColorConfig {
  if (color && CARD_COLORS[color]) {
    return CARD_COLORS[color]
  }
  return CARD_COLORS.white
}
