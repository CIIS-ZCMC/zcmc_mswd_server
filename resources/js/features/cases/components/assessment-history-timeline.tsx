import React from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Assessment } from "../types/assessment.types"
import {
  formatCurrency,
  getBracketColor,
  getClassificationBadgeText,
} from "../lib/classification"
import { ArrowRight, Calendar, GitMerge, ShieldAlert, User } from "lucide-react"


interface AssessmentHistoryTimelineProps {
  assessments: Assessment[]
  className?: string
}

export const AssessmentHistoryTimeline: React.FC<AssessmentHistoryTimelineProps> = ({
  assessments,
  className = "",
}) => {
  if (!assessments || assessments.length === 0) {
    return (
      <Card className={`border border-border/80 ${className}`}>
        <CardContent className="py-8 text-center text-xs text-muted-foreground">
          No historical assessment records found for this case episode.
        </CardContent>
      </Card>
    )
  }

  // Sort newest first
  const sortedAssessments = [...assessments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <Card className={`border border-border/80 shadow-xs ${className}`}>
      <CardHeader className="bg-muted/30 border-b border-border/60 pb-3">
        <CardTitle className="text-sm font-extrabold flex items-center gap-2 text-foreground">
          <GitMerge className="w-4 h-4 text-primary" />
          Assessment Snapshot & Re-assessment Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-5 space-y-6">
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/80">
          {sortedAssessments.map((item, index) => {
            const isInitial = !item.parentAssessmentId && index === sortedAssessments.length - 1
            const parentItem = assessments.find((a) => a.id === item.parentAssessmentId)

            return (
              <div key={item.id} className="relative group">
                {/* Timeline node icon */}
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center text-[10px] font-bold text-primary shadow-2xs">
                  {sortedAssessments.length - index}
                </div>

                <div className="rounded-xl border border-border/70 p-4 bg-card hover:bg-muted/20 transition-all space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs font-bold px-2.5 py-0.5 ${getBracketColor(item.classification)}`}>
                        {getClassificationBadgeText(item.classification)}
                      </Badge>

                      {isInitial ? (
                        <Badge variant="outline" className="text-[11px] font-bold border-indigo-500/40 text-indigo-700 dark:text-indigo-300">
                          Initial Intake Assessment
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[11px] font-bold border-amber-500/40 text-amber-700 dark:text-amber-300">
                          Re-assessment
                        </Badge>
                      )}

                      {item.hasOverride && (
                        <Badge variant="destructive" className="text-[10px] font-extrabold gap-1">
                          <ShieldAlert className="w-3 h-3" /> Override
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                      {item.createdByName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          {item.createdByName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Classification shift & Parent linkage */}
                  {parentItem && (
                    <div className="text-xs bg-muted/40 p-2 rounded-lg border border-border/40 flex items-center gap-2 text-foreground font-medium">
                      <span>Shifted from</span>
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {getClassificationBadgeText(parentItem.classification)}
                      </Badge>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                      <Badge className={`text-[10px] font-bold ${getBracketColor(item.classification)}`}>
                        {getClassificationBadgeText(item.classification)}
                      </Badge>
                      <span className="text-muted-foreground text-[11px] font-mono ml-auto">
                        (Parent Snapshot #{parentItem.id})
                      </span>
                    </div>
                  )}

                  {/* Reassessment Reason */}
                  {item.reassessmentReason && (
                    <div className="text-xs text-foreground">
                      <span className="font-bold text-muted-foreground">Reason:</span>{" "}
                      <span className="font-semibold">{item.reassessmentReason}</span>
                    </div>
                  )}

                  {/* Justification note if override */}
                  {item.hasOverride && item.classificationOverrideReason && (
                    <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-500/10 p-2 rounded-md border border-amber-500/20 italic">
                      Override Justification: "{item.classificationOverrideReason}"
                    </div>
                  )}

                  {/* Metrics snapshot summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-muted-foreground block font-medium">Per Capita:</span>
                      <span className="font-extrabold font-mono text-primary">
                        {item.netPerCapitaIncome !== null ? formatCurrency(item.netPerCapitaIncome) : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block font-medium">Total Income:</span>
                      <span className="font-bold font-mono">{formatCurrency(item.totalFamilyIncome)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block font-medium">Expenses:</span>
                      <span className="font-bold font-mono">{formatCurrency(item.expensesTotal)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block font-medium">Household Size:</span>
                      <span className="font-bold font-mono">{item.householdSize} member(s)</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
