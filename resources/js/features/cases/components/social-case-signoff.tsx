import React from "react"
import { Badge } from "@/components/ui/badge"
import { Calendar, CheckCircle2, Clock, User } from "lucide-react"
import type { SocialCase } from "../types"

interface SocialCaseSignoffProps {
  socialCase: SocialCase
}

export const SocialCaseSignoff: React.FC<SocialCaseSignoffProps> = ({ socialCase }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/80">
      {/* Prepared By (Social Worker) */}
      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Prepared By (Medical Social Worker)
          </span>
          {socialCase.preparedAt ? (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300">
              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
              Authored
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              In Progress
            </Badge>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
            <User className="w-4 h-4 text-primary" />
            {socialCase.preparedBy ?? "Unassigned Worker"}
          </div>
          {socialCase.preparedAt && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(socialCase.preparedAt).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Noted By (Section Head) */}
      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Noted By (Section Head / Supervisor)
          </span>
          {socialCase.notedAt ? (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300">
              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
              Finalized & Signed
            </Badge>
          ) : socialCase.status === "for_review" ? (
            <Badge variant="default" className="bg-amber-500 text-white font-medium text-xs">
              <Clock className="w-3 h-3 mr-1" />
              Awaiting Sign-off
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Pending Finalization
            </Badge>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
            <User className="w-4 h-4 text-primary" />
            {socialCase.notedBy ?? "Pending Section Head Review"}
          </div>
          {socialCase.notedAt && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(socialCase.notedAt).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
