import React from "react"
import { router, usePage } from "@inertiajs/react"
import { BarChart3, Timer } from "lucide-react"
import { cn } from "@/lib/utils"

export const ReportsSubnav: React.FC = () => {
  const page = usePage()
  const pathname = page.url.split("?")[0]

  const isSocialCases =
    pathname === "/reports" ||
    pathname === "/reports/index" ||
    pathname.startsWith("/reports/social-cases")
  const isTurnaround = pathname.startsWith("/reports/turnaround")

  return (
    <div className="flex items-center gap-1.5 border-b border-border/80 bg-muted/30 px-6 py-2">
      <button
        onClick={() => router.visit("/reports/social-cases")}
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-1.5 text-xs font-bold transition-all",
          isSocialCases
            ? "border-primary/20 bg-background text-foreground shadow-2xs"
            : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <BarChart3 className="size-3.5 text-primary" />
        <span>Social Cases Report</span>
      </button>

      <button
        onClick={() => router.visit("/reports/turnaround")}
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-1.5 text-xs font-bold transition-all",
          isTurnaround
            ? "border-primary/20 bg-background text-foreground shadow-2xs"
            : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Timer className="size-3.5 text-primary" />
        <span>Turnaround Time (TAT)</span>
      </button>
    </div>
  )
}
