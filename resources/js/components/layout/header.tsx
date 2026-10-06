import React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "@/providers/theme-provider"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { Activity, LogOut, Moon, Plus, Sun, UserCheck } from "lucide-react"

interface HeaderProps {
  onNewIntake?: () => void
}

export const Header: React.FC<HeaderProps> = ({ onNewIntake }) => {
  const { theme, setTheme } = useTheme()
  const { user, logout, isLoggingOut } = useAuth()

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const displayName = user?.employee_name || user?.email || "—"

  return (
    <header className="flex h-15 shrink-0 items-center justify-between border-b border-border bg-card px-5 py-2.5 shadow-2xs">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-extrabold font-heading text-lg shadow-xs">
            Z
          </div>
          <div>
            <h1 className="font-heading text-base font-bold tracking-tight leading-none text-foreground">
              ZCMC Medical Social Services
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Zamboanga City Medical Center • Patient Safety Net Portal
            </p>
          </div>
        </div>
        <Badge variant="outline" className="hidden sm:flex gap-1.5 text-xs px-2.5 py-1">
          <Activity className="size-3.5 text-emerald-500" /> Live Database
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        <Button size="default" className="gap-2 font-bold h-10 px-4" onClick={onNewIntake}>
          <Plus className="size-4" /> New Patient Intake
        </Button>
        <div className="h-5 w-px bg-border mx-1" />
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground mr-2">
          <UserCheck className="size-4 text-primary" />
          <span className="font-semibold text-foreground text-sm">{displayName}</span>
        </div>
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="outline"
              size="default"
              className="h-10 w-10 p-0"
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4 text-primary" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle Theme (Press &apos;d&apos;)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="outline"
              size="default"
              className="h-10 w-10 p-0"
              onClick={() => logout()}
              disabled={isLoggingOut}
            >
              <LogOut className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Sign Out</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
