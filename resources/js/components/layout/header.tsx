import React, { useState, useEffect } from "react"
import { router, usePage } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Kbd } from "@/components/ui/kbd"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useTheme } from "@/providers/theme-provider"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { PatientSearchImportDialog } from "@/features/patients/components/dialogs/patient-search-import-dialog"
import {
  Activity,
  BookOpen,
  LogOut,
  Moon,
  Sun,
  UserCheck,
  UserSearch,
} from "lucide-react"

export const Header: React.FC = () => {
  const { theme, setTheme } = useTheme()
  const { user, logout, isLoggingOut } = useAuth()
  const canManageLibrary = usePermission("library.manage")
  const canViewPatients = usePermission("patients.view")
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false)
  const pageObj = usePage()
  const pathname = pageObj.url.split("?")[0]
  const isLibraryRoute = pathname.startsWith("/library")

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        if (canViewPatients) {
          setIsSearchDialogOpen((prev) => !prev)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [canViewPatients])

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const displayName = user?.employee_name || user?.email || "—"

  return (
    <header className="flex h-15 shrink-0 items-center justify-between border-b border-border bg-card px-5 py-2.5 shadow-2xs">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary font-heading text-lg font-extrabold text-primary-foreground shadow-xs">
            Z
          </div>
          <div>
            <h1 className="font-heading text-base leading-none font-bold tracking-tight text-foreground">
              ZCMC Medical Social Services
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Zamboanga City Medical Center • Patient Safety Net Portal
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="hidden gap-1.5 px-2.5 py-1 text-xs sm:flex"
        >
          <Activity className="size-3.5 text-emerald-500" /> Live Database
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        {canViewPatients && (
          <>
            <Tooltip>
              {/* render= so the trigger IS the Button (no <button> in <button>). */}
              <TooltipTrigger
                render={
                  <Button
                    size="default"
                    className="h-10 gap-2 px-3.5 font-bold shadow-xs sm:px-4"
                    onClick={() => setIsSearchDialogOpen(true)}
                  />
                }
              >
                <UserSearch className="size-4" />
                <span className="hidden sm:inline">
                  Search or Import Patient
                </span>
                <Kbd className="ml-1 hidden border-transparent bg-primary-foreground/20 text-[10px] text-primary-foreground md:inline-flex">
                  Ctrl K
                </Kbd>
              </TooltipTrigger>
              <TooltipContent className="sm:hidden">
                Search or Import Patient (Ctrl+K)
              </TooltipContent>
            </Tooltip>

            <PatientSearchImportDialog
              isOpen={isSearchDialogOpen}
              onClose={() => setIsSearchDialogOpen(false)}
            />
          </>
        )}
        <div className="mx-1 h-5 w-px bg-border" />
        <div className="mr-2 hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <UserCheck className="size-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {displayName}
          </span>
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

        {canManageLibrary && (
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant={isLibraryRoute ? "default" : "outline"}
                size="default"
                className={`h-10 w-10 p-0 ${isLibraryRoute ? "shadow-xs" : ""}`}
                onClick={() => router.visit("/library")}
              >
                <BookOpen className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Library Settings</TooltipContent>
          </Tooltip>
        )}

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
