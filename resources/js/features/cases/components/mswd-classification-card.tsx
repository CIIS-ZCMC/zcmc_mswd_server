import React from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { Assessment } from "../types/assessment.types"
import {
  formatCurrency,
  getBracketColor,
  getBracketLabel,
  getClassificationBadgeText,
} from "../lib/classification"
import { AlertTriangle, Calculator, DollarSign, Info, ShieldAlert, Users } from "lucide-react"


interface MswdClassificationCardProps {
  assessment: Assessment
  className?: string
}

export const MswdClassificationCard: React.FC<MswdClassificationCardProps> = ({
  assessment,
  className = "",
}) => {
  const {
    classification,
    calculatedClassification,
    hasOverride,
    classificationOverrideReason,
    netPerCapitaIncome,
    totalFamilyIncome,
    expensesTotal,
    householdSize,
    calculatedDiscountRate,
    reassessmentReason,
  } = assessment

  return (
    <Card className={`border border-border/80 shadow-xs overflow-hidden ${className}`}>
      <CardHeader className="bg-muted/40 border-b border-border/60 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Badge
              className={`text-base font-black px-3.5 py-1 tracking-wider uppercase shadow-xs ${getBracketColor(
                classification
              )}`}
            >
              {getClassificationBadgeText(classification)}
            </Badge>
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                {getBracketLabel(classification)}
              </CardTitle>
              {reassessmentReason && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reason: <span className="font-semibold text-foreground">{reassessmentReason}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {calculatedDiscountRate !== null && calculatedDiscountRate !== undefined && (
              <Badge variant="outline" className="text-xs font-extrabold border-primary/40 bg-primary/10 text-primary">
                {calculatedDiscountRate}% Discount Rate
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Manual Override Warning Banner */}
        {hasOverride && (
          <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="font-extrabold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Manual Classification Override Active
            </AlertTitle>
            <AlertDescription className="text-xs mt-1 leading-relaxed">
              Calculated bracket by net per capita income was{" "}
              <strong className="font-bold underline">Class {calculatedClassification || "N/A"}</strong>, but social worker manually overrode classification to{" "}
              <strong className="font-bold underline">{getClassificationBadgeText(classification)}</strong>.
              {classificationOverrideReason && (
                <div className="mt-1 pt-1 border-t border-amber-500/20 text-xs italic">
                  Justification: "{classificationOverrideReason}"
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Income & Per Capita Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-primary" />
              Net Per Capita Income
            </span>
            <p className="text-base font-extrabold font-mono text-primary">
              {netPerCapitaIncome !== null ? `${formatCurrency(netPerCapitaIncome)}` : "N/A"}
              <span className="text-[10px] text-muted-foreground font-sans font-normal ml-1">/mo</span>
            </p>
          </div>

          <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              Total Monthly Income
            </span>
            <p className="text-base font-extrabold font-mono text-foreground">
              {formatCurrency(totalFamilyIncome)}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Total Monthly Expenses
            </span>
            <p className="text-base font-extrabold font-mono text-foreground">
              {formatCurrency(expensesTotal)}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-500" />
              Household Size
            </span>
            <p className="text-base font-extrabold font-mono text-foreground">
              {householdSize} <span className="text-[10px] text-muted-foreground font-sans font-normal">member(s)</span>
            </p>
          </div>
        </div>

        {/* Calculation Formula Footer */}
        <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg p-2.5 flex items-center gap-2 border border-border/40 font-mono">
          <Info className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span>
            Net Per Capita = (Total Household Income ({formatCurrency(totalFamilyIncome)}) - Total Expenses ({formatCurrency(expensesTotal)})) / Household Size ({householdSize})
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
