import React from "react"
import { Badge } from "@/components/ui/badge"
import type { RegistryStatus } from "../types/hospital-transaction.types"
import { Building2, Home, LogOut, XCircle, HelpCircle } from "lucide-react"

const STATUS_CONFIG: Record<string, { className: string; icon: React.ElementType }> = {
  A: {
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
    icon: Building2,
  },
  D: {
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40",
    icon: LogOut,
  },
  X: {
    className: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40",
    icon: XCircle,
  },
  M: {
    className: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40",
    icon: Home,
  },
  U: {
    className: "bg-muted text-muted-foreground border-border",
    icon: HelpCircle,
  },
}

interface RegistryStatusBadgeProps {
  status: RegistryStatus | null
}

export const RegistryStatusBadge: React.FC<RegistryStatusBadgeProps> = ({ status }) => {
  if (!status) {
    return (
      <Badge variant="outline" className="font-semibold text-xs px-2.5 py-0.5 gap-1.5">
        <HelpCircle className="w-3.5 h-3.5 shrink-0" />
        Unknown
      </Badge>
    )
  }

  const config = STATUS_CONFIG[status.code] ?? STATUS_CONFIG.U
  const Icon = config.icon

  return (
    <Badge variant="outline" className={`font-semibold text-xs px-2.5 py-0.5 gap-1.5 border ${config.className}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {status.label}
    </Badge>
  )
}

