import React from "react"
import type { RegistryStatus } from "../types/hospital-transaction.types"
import { Building2, Home, LogOut, XCircle, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const STATUS_CONFIG: Record<string, { className: string; icon: React.ElementType }> = {
  A: {
    className: "bg-[#e8f6ef] text-[#146b43] dark:bg-emerald-950/40 dark:text-emerald-300",
    icon: Building2,
  },
  D: {
    className: "bg-[#eef1f6] text-[#4a5568] dark:bg-muted dark:text-muted-foreground",
    icon: LogOut,
  },
  X: {
    className: "bg-[#fde8e8] text-[#9b1c1c] dark:bg-red-950/40 dark:text-red-300",
    icon: XCircle,
  },
  M: {
    className: "bg-[#fff5e0] text-[#8a5300] dark:bg-amber-950/40 dark:text-amber-300",
    icon: Home,
  },
  U: {
    className: "bg-[#f4f7fc] text-[#5b6678] dark:bg-muted dark:text-muted-foreground",
    icon: HelpCircle,
  },
}

interface RegistryStatusBadgeProps {
  status: RegistryStatus | null
  className?: string
}

export const RegistryStatusBadge: React.FC<RegistryStatusBadgeProps> = ({ status, className }) => {
  if (!status) {
    return (
      <span className={cn("inline-flex items-center gap-[4px] px-[10px] py-[4px] rounded-full text-[12px] font-semibold bg-[#f4f7fc] text-[#5b6678] dark:bg-muted dark:text-muted-foreground", className)}>
        <HelpCircle className="size-3.5 shrink-0" />
        Unknown
      </span>
    )
  }

  const config = STATUS_CONFIG[status.code] ?? STATUS_CONFIG.U
  const Icon = config.icon

  return (
    <span className={cn("inline-flex items-center gap-[4px] px-[10px] py-[4px] rounded-full text-[12px] font-semibold", config.className, className)}>
      <Icon className="size-3.5 shrink-0" />
      {status.label}
    </span>
  )
}

