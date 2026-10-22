import React from "react"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useQueueActionGate } from "@/features/queue"
import { Ban, CheckCircle, MoreHorizontal, Star, UserMinus } from "lucide-react"

/** Pass state as a badge; "No Pass" until one has been issued. */
export const PassStatusBadge: React.FC<{ status: string; passNumber: string | null }> = ({
  status,
  passNumber,
}) => {
  if (!passNumber) {
    return (
      <Badge variant="outline" className="border-border text-xs text-muted-foreground">
        No Pass
      </Badge>
    )
  }

  switch (status.toLowerCase()) {
    case "active":
      return (
        <Badge variant="outline" className="border-emerald-500 bg-emerald-50/50 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
          Active
        </Badge>
      )
    case "expired":
      return (
        <Badge variant="outline" className="border-amber-500 bg-amber-50/50 px-2.5 py-0.5 text-xs font-bold text-amber-600">
          Expired
        </Badge>
      )
    case "revoked":
      return (
        <Badge variant="outline" className="border-destructive/50 bg-destructive/10 px-2.5 py-0.5 text-xs font-bold text-destructive">
          Revoked
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="px-2.5 py-0.5 text-xs">
          {status}
        </Badge>
      )
  }
}

export const RoleBadges: React.FC<{ isPrimary: boolean; isInformant: boolean }> = ({
  isPrimary,
  isInformant,
}) => (
  <>
    {isPrimary && (
      <Badge variant="default" className="bg-amber-500 px-1.5 py-0 text-[10px] font-bold text-white hover:bg-amber-600">
        Primary
      </Badge>
    )}
    {isInformant && (
      <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-semibold">
        Informant
      </Badge>
    )}
  </>
)

interface AssignmentMenuProps {
  isPrimary: boolean
  passNumber: string | null
  passStatus: string
  onMakePrimary: () => void
  onIssuePass: () => void
  onRevokePass: () => void
  onUnassign: () => void
}

const itemClass = "cursor-pointer gap-2 px-2.5 py-2 text-xs font-semibold sm:text-sm"

/** What can be done to one watcher's assignment on one open case. */
export const AssignmentMenu: React.FC<AssignmentMenuProps> = ({
  isPrimary,
  passNumber,
  passStatus,
  onMakePrimary,
  onIssuePass,
  onRevokePass,
  onUnassign,
}) => {
  const { canPerformActions } = useQueueActionGate()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex size-8.5 cursor-pointer items-center justify-center rounded-md border border-input bg-background p-0 text-muted-foreground shadow-2xs hover:bg-muted hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
        <MoreHorizontal className="size-4.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 space-y-0.5 p-1.5">
        {!isPrimary && (
          <DropdownMenuItem
            disabled={!canPerformActions}
            onClick={onMakePrimary}
            className={itemClass}
          >
            <Star className="size-4 shrink-0 text-amber-500" /> Make Primary
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          disabled={!canPerformActions}
          onClick={onIssuePass}
          className={itemClass}
        >
          <CheckCircle className="size-4 shrink-0 text-emerald-600" />
          {passNumber ? "Reissue Pass" : "Issue Ward Pass"}
        </DropdownMenuItem>
        {passNumber && passStatus === "active" && (
          <DropdownMenuItem
            disabled={!canPerformActions}
            onClick={onRevokePass}
            className={itemClass}
          >
            <Ban className="size-4 shrink-0 text-amber-600" /> Revoke Pass
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem
          disabled={!canPerformActions}
          onClick={onUnassign}
          className={`${itemClass} text-destructive focus:text-destructive`}
        >
          <UserMinus className="size-4 shrink-0" /> Unassign from Case
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
