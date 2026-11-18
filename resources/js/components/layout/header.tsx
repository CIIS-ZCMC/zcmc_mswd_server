import React, { useState, useEffect } from "react"
import { router, usePage } from "@inertiajs/react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useTheme } from "@/providers/theme-provider"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { PatientSearchImportDialog } from "@/features/patients/components/dialogs/patient-search-import-dialog"
import { Sun } from "lucide-react"
import { cn } from "@/lib/utils"

function formatCurrentHeaderDate(): string {
  const now = new Date()
  return now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export const Header: React.FC = () => {
  const { theme, setTheme } = useTheme()
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

  return (
    <header
      data-node-id="144:694"
      className="flex shrink-0 items-center justify-between bg-[#f4f7fc] px-[28px] py-[15px] dark:bg-background"
    >
      {/* Left: Search or Import Patient + Live database pill */}
      <div className="flex items-center gap-[10px]">
        {canViewPatients && (
          <>
            <button
              type="button"
              onClick={() => setIsSearchDialogOpen(true)}
              data-node-id="144:695"
              className="flex h-[44px] w-[260px] shrink-0 cursor-pointer items-center gap-[10px] rounded-full border border-[#e4e9f2] bg-white pr-[8px] pl-[16px] transition-colors hover:border-[#1f5fd6]/40 sm:w-[330px] dark:border-border dark:bg-card"
            >
              <span className="relative flex size-[20px] shrink-0 items-center justify-center">
                <img
                  alt=""
                  className="block size-[20px] max-w-none"
                  src="/images/patient-registry/user-search.svg"
                />
              </span>
              <span className="min-w-0 flex-1 truncate text-left text-[14px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground">
                Search or import patient
              </span>
              <span className="flex h-[26px] shrink-0 items-center rounded-[8px] border border-[#e4e9f2] bg-[#f4f7fc] px-[9px] text-[11px] leading-[22px] font-semibold text-[#5b6678] dark:border-border dark:bg-muted dark:text-muted-foreground">
                Ctrl K
              </span>
            </button>

            <PatientSearchImportDialog
              isOpen={isSearchDialogOpen}
              onClose={() => setIsSearchDialogOpen(false)}
            />
          </>
        )}

        <div
          data-node-id="144:703"
          className="hidden h-[30px] shrink-0 items-center gap-[6px] rounded-full bg-[#e8f6ef] px-[12px] sm:flex dark:bg-emerald-950/60"
        >
          <span className="size-[7px] shrink-0 rounded-full bg-[#146b43] dark:bg-emerald-400" />
          <span className="text-[12px] leading-normal font-bold text-[#146b43] whitespace-nowrap dark:text-emerald-300">
            Live database
          </span>
        </div>
      </div>

      {/* Right: Date pill + Theme toggle + User guide / Library */}
      <div className="flex items-center gap-[10px]">
        <div
          data-node-id="144:706"
          className="hidden h-[46px] shrink-0 items-center gap-[8px] rounded-full border border-[#e4e9f2] bg-white px-[17px] py-px md:flex dark:border-border dark:bg-card"
        >
          <span className="relative flex size-[20px] shrink-0 items-center justify-center">
            <img
              alt=""
              className="block size-[20px] max-w-none"
              src="/images/patient-registry/calendar.svg"
            />
          </span>
          <span className="text-[13px] leading-normal font-semibold text-[#0c2a5b] whitespace-nowrap dark:text-foreground">
            {formatCurrentHeaderDate()}
          </span>
        </div>

        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={toggleTheme}
                data-node-id="144:711"
                className="flex size-[44px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#e4e9f2] bg-white px-[6px] py-px transition-colors hover:bg-white/80 dark:border-border dark:bg-card"
              />
            }
          >
            {theme === "dark" ? (
              <Sun className="size-[21px] text-amber-400" />
            ) : (
              <img
                alt="Switch to dark theme"
                className="block size-[21px] max-w-none"
                src="/images/patient-registry/theme-moon.svg"
              />
            )}
          </TooltipTrigger>
          <TooltipContent>Toggle Theme</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={() => {
                  if (canManageLibrary) {
                    router.visit("/library")
                  }
                }}
                data-node-id="144:714"
                className={cn(
                  "flex size-[44px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#e4e9f2] bg-white px-[6px] py-px transition-colors hover:bg-white/80 dark:border-border dark:bg-card",
                  isLibraryRoute && "ring-2 ring-[#1f5fd6]"
                )}
              />
            }
          >
            <img
              alt="User guide & Library"
              className="block size-[21px] max-w-none"
              src="/images/patient-registry/user-guide.svg"
            />
          </TooltipTrigger>
          <TooltipContent>
            {canManageLibrary ? "Library Settings" : "User Guide"}
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
