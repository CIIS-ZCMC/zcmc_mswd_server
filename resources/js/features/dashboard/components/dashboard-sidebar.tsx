import React, { useState } from "react"
import { router, usePage } from "@inertiajs/react"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { cn } from "@/lib/utils"

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return "JD"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function SpaceDashboardIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("size-[22px] shrink-0", className)}
      aria-hidden="true"
    >
      <path d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h6v18H5Zm8 0v-8h8v6q0 .825-.587 1.413T19 21h-6Zm0-10V3h6q.825 0 1.413.588T21 5v6h-8Z" />
    </svg>
  )
}

function FolderSharedIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-[22px] shrink-0", className)}
      aria-hidden="true"
    >
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
      <circle cx="12" cy="11.5" r="2" />
      <path d="M8.5 16.5c.8-1.3 2-2 3.5-2s2.7.7 3.5 2" />
    </svg>
  )
}

function ApprovalIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-[22px] shrink-0", className)}
      aria-hidden="true"
    >
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      <path d="M4 16h16" />
      <path d="M12 13s4-3.2 4-6.5a4 4 0 1 0-8 0C8 9.8 12 13 12 13Z" />
    </svg>
  )
}

function BarChartIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-[22px] shrink-0", className)}
      aria-hidden="true"
    >
      <line x1="6" y1="20" x2="6" y2="13" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="18" y1="20" x2="18" y2="9" />
    </svg>
  )
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-[20px] shrink-0", className)}
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

interface DashboardSidebarProps {
  pendingApprovalsCount?: number
  defaultCollapsed?: boolean
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  pendingApprovalsCount = 3,
  defaultCollapsed = false,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const { user, logout, isLoggingOut } = useAuth()
  const pageObj = usePage()
  const pathname = pageObj.url.split("?")[0]

  const canViewCases = usePermission("cases.view")
  const canViewPatients = usePermission("patients.view")
  const canManageQueue = usePermission("queue.manage")
  const canViewReports = usePermission("reports.view")
  const canManageDar = usePermission("dar.manage")
  const canViewAudit = usePermission("audit.view")

  const displayName = user?.employee_name || "Juan Dela Cruz"
  const displayRole =
    user?.role && user.role !== "Super Admin"
      ? user.role
      : "Medical Social Worker II"
  const initials =
    user?.employee_name && user.employee_name !== "Admin University"
      ? getInitials(user.employee_name)
      : "JD"

  const isDashboardActive = pathname === "/"
  const isCasesActive =
    pathname.startsWith("/patients") ||
    pathname.startsWith("/caseload") ||
    pathname.startsWith("/cases")
  const isApprovalsActive = pathname.startsWith("/queue")
  const isReportsActive = pathname.startsWith("/reports")
  const isDarActive = pathname.startsWith("/dar")
  const isAuditActive = pathname.startsWith("/audit")

  const handleOpenPatientCases = () => {
    router.visit("/patients")
  }

  return (
    <aside
      data-node-id={collapsed ? "147:705" : "147:644"}
      className={cn(
        "relative flex h-full shrink-0 flex-col gap-[4px] border-r border-[rgba(12,42,91,0.06)] bg-gradient-to-b from-[#dce8fd] via-[#e4f2fb] via-[55%] to-[#e6f7f7] px-[16px] pt-[24px] pb-[16px] transition-all duration-200 select-none",
        collapsed ? "w-[76px]" : "w-[248px]"
      )}
    >
      {/* Brand Header */}
      {collapsed ? (
        <div className="flex w-full shrink-0 flex-col items-center justify-center gap-[12px] px-[8px] pb-[20px]">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
            className="relative size-[24px] shrink-0 cursor-pointer rounded-md hover:bg-black/5"
          >
            <img
              alt="Menu"
              className="absolute inset-0 block size-full max-w-none"
              src="/images/dashboard/icon-menu.svg"
            />
          </button>
          <div
            onClick={() => router.visit("/")}
            className="relative size-[40px] shrink-0 cursor-pointer overflow-clip"
            title="MSWD · UIS Dashboard"
          >
            <img
              alt="UIS"
              className="absolute inset-0 block size-full max-w-none"
              src="/images/dashboard/uis-logo-bg.svg"
            />
            <div className="absolute inset-0 flex items-center justify-center text-[14px] font-semibold text-white">
              UIS
            </div>
          </div>
        </div>
      ) : (
        <div className="flex w-full shrink-0 items-center gap-[12px] px-[8px] pb-[20px]">
          <div
            onClick={() => router.visit("/")}
            className="relative size-[40px] shrink-0 cursor-pointer overflow-clip"
            title="MSWD · UIS Dashboard"
          >
            <img
              alt="UIS"
              className="absolute inset-0 block size-full max-w-none"
              src="/images/dashboard/uis-logo-bg.svg"
            />
            <div className="absolute inset-0 flex items-center justify-center text-[14px] font-semibold text-white">
              UIS
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col items-start">
            <p className="truncate text-[16px] leading-tight font-extrabold tracking-[-0.2px] text-[#0c2a5b]">
              MSWD · UIS
            </p>
            <p className="truncate text-[12px] leading-tight font-medium text-[#5b6678]">
              Case management
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCollapsed(true)}
            title="Collapse sidebar"
            className="relative size-[24px] shrink-0 cursor-pointer rounded-md hover:bg-black/5"
          >
            <img
              alt="Menu"
              className="absolute inset-0 block size-full max-w-none"
              src="/images/dashboard/icon-menu.svg"
            />
          </button>
        </div>
      )}

      {/* CASEWORK / CW Section */}
      <div className="w-full shrink-0 px-[12px] pt-[8px] pb-[6px]">
        <p className="text-[11px] leading-normal font-bold tracking-[1px] text-[#5b6678] uppercase">
          {collapsed ? "CW" : "CASEWORK"}
        </p>
      </div>

      <button
        type="button"
        onClick={() => router.visit("/")}
        title="Dashboard"
        className={cn(
          "flex h-[44px] w-full shrink-0 cursor-pointer items-center gap-[12px] rounded-[12px] px-[12px] text-left transition-all",
          isDashboardActive
            ? "bg-white text-[#1f5fd6] shadow-[0px_1px_1px_rgba(12,42,91,0.06),0px_6px_8px_rgba(12,42,91,0.08)]"
            : "text-[#0c2a5b] hover:bg-white/50"
        )}
      >
        <SpaceDashboardIcon
          className={isDashboardActive ? "text-[#1f5fd6]" : "text-[#0c2a5b]"}
        />
        {!collapsed && (
          <span
            className={cn(
              "truncate text-[14px] font-semibold",
              isDashboardActive ? "text-[#1f5fd6]" : "text-[#0c2a5b]"
            )}
          >
            Dashboard
          </span>
        )}
      </button>

      {(canViewCases || canViewPatients) && (
        <button
          type="button"
          onClick={handleOpenPatientCases}
          title="Patient Cases"
          className={cn(
            "flex h-[44px] w-full shrink-0 cursor-pointer items-center gap-[12px] rounded-[12px] px-[12px] text-left transition-all",
            isCasesActive
              ? "bg-white text-[#1f5fd6] shadow-[0px_1px_1px_rgba(12,42,91,0.06),0px_6px_8px_rgba(12,42,91,0.08)]"
              : "text-[#0c2a5b] hover:bg-white/50"
          )}
        >
          <FolderSharedIcon
            className={isCasesActive ? "text-[#1f5fd6]" : "text-[#0c2a5b]"}
          />
          {!collapsed && (
            <span
              className={cn(
                "truncate text-[14px] font-semibold",
                isCasesActive ? "text-[#1f5fd6]" : "text-[#0c2a5b]"
              )}
            >
              Patient Cases
            </span>
          )}
        </button>
      )}

      {/* OVERSIGHT / OS Section */}
      <div className="w-full shrink-0 px-[12px] pt-[16px] pb-[6px]">
        <p className="text-[11px] leading-normal font-bold tracking-[1px] text-[#5b6678] uppercase">
          {collapsed ? "OS" : "OVERSIGHT"}
        </p>
      </div>

      {canManageQueue && (
        <button
          type="button"
          onClick={() => router.visit("/queue")}
          title="Approvals"
          className={cn(
            "flex h-[44px] shrink-0 cursor-pointer items-center rounded-[12px] px-[12px] text-left transition-all",
            collapsed ? "gap-0" : "w-full gap-[12px]",
            isApprovalsActive
              ? "bg-white text-[#1f5fd6] shadow-[0px_1px_1px_rgba(12,42,91,0.06),0px_6px_8px_rgba(12,42,91,0.08)]"
              : "text-[#0c2a5b] hover:bg-white/50"
          )}
        >
          <span className={cn("shrink-0", collapsed && "mr-[-6px]")}>
            <ApprovalIcon
              className={isApprovalsActive ? "text-[#1f5fd6]" : "text-[#0c2a5b]"}
            />
          </span>
          {!collapsed && (
            <span
              className={cn(
                "flex-1 truncate text-[14px] font-semibold",
                isApprovalsActive ? "text-[#1f5fd6]" : "text-[#0c2a5b]"
              )}
            >
              Approvals
            </span>
          )}
          {pendingApprovalsCount > 0 && (
            <span className="relative flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-[#d7263d] px-[7.33px] text-[12px] leading-[22px] font-bold text-white">
              {pendingApprovalsCount}
            </span>
          )}
        </button>
      )}

      {canViewReports && (
        <button
          type="button"
          onClick={() => router.visit("/reports/social-cases")}
          title="Reports"
          className={cn(
            "flex h-[44px] w-full shrink-0 cursor-pointer items-center gap-[12px] rounded-[12px] px-[12px] text-left transition-all",
            isReportsActive
              ? "bg-white text-[#1f5fd6] shadow-[0px_1px_1px_rgba(12,42,91,0.06),0px_6px_8px_rgba(12,42,91,0.08)]"
              : "text-[#0c2a5b] hover:bg-white/50"
          )}
        >
          <BarChartIcon
            className={isReportsActive ? "text-[#1f5fd6]" : "text-[#0c2a5b]"}
          />
          {!collapsed && (
            <span
              className={cn(
                "truncate text-[14px] font-semibold",
                isReportsActive ? "text-[#1f5fd6]" : "text-[#0c2a5b]"
              )}
            >
              Reports
            </span>
          )}
        </button>
      )}

      {canManageDar && (
        <button
          type="button"
          onClick={() => router.visit("/dar")}
          title="DAR"
          className={cn(
            "flex h-[44px] w-full shrink-0 cursor-pointer items-center gap-[12px] rounded-[12px] px-[12px] text-left transition-all",
            isDarActive
              ? "bg-white text-[#1f5fd6] shadow-[0px_1px_1px_rgba(12,42,91,0.06),0px_6px_8px_rgba(12,42,91,0.08)]"
              : "text-[#0c2a5b] hover:bg-white/50"
          )}
        >
          <span className="relative flex size-[22px] shrink-0 items-center justify-center">
            <img
              alt=""
              className="block size-full max-w-none"
              src="/images/dashboard/icon-dar.svg"
            />
          </span>
          {!collapsed && (
            <span
              className={cn(
                "truncate text-[14px] font-semibold",
                isDarActive ? "text-[#1f5fd6]" : "text-[#0c2a5b]"
              )}
            >
              DAR
            </span>
          )}
        </button>
      )}

      {canViewAudit && (
        <button
          type="button"
          onClick={() => router.visit("/audit")}
          title="Audit"
          className={cn(
            "flex h-[44px] w-full shrink-0 cursor-pointer items-center gap-[12px] rounded-[12px] px-[12px] text-left transition-all",
            isAuditActive
              ? "bg-white text-[#1f5fd6] shadow-[0px_1px_1px_rgba(12,42,91,0.06),0px_6px_8px_rgba(12,42,91,0.08)]"
              : "text-[#0c2a5b] hover:bg-white/50"
          )}
        >
          <span className="relative flex size-[22px] shrink-0 items-center justify-center">
            <img
              alt=""
              className="block size-full max-w-none"
              src="/images/dashboard/icon-audit.svg"
            />
          </span>
          {!collapsed && (
            <span
              className={cn(
                "truncate text-[14px] font-semibold",
                isAuditActive ? "text-[#1f5fd6]" : "text-[#0c2a5b]"
              )}
            >
              Audit
            </span>
          )}
        </button>
      )}

      <div className="min-h-px flex-1" />

      {/* Bottom User Card */}
      <div
        className={cn(
          "flex w-full shrink-0 items-center rounded-[14px] border border-[rgba(255,255,255,0.9)] bg-[rgba(255,255,255,0.72)] p-[13px]",
          collapsed ? "justify-center p-[3px]" : "gap-[12px]"
        )}
      >
        <div
          onClick={() => {
            if (collapsed) logout()
          }}
          title={collapsed ? `${displayName} (Click to sign out)` : displayName}
          className={cn(
            "flex size-[38px] shrink-0 items-center justify-center rounded-[19px] bg-[#0c2a5b] text-[13px] font-bold text-white",
            collapsed && "cursor-pointer"
          )}
        >
          {initials}
        </div>
        {!collapsed && (
          <>
            <div className="flex min-w-0 flex-1 flex-col items-start overflow-hidden">
              <p className="w-full truncate text-[13px] leading-tight font-bold text-[#0c2a5b]">
                {displayName}
              </p>
              <p className="w-full truncate text-[12px] leading-tight font-normal text-[#5b6678]">
                {displayRole}
              </p>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              disabled={isLoggingOut}
              title="Sign out"
              className="flex size-[36px] shrink-0 cursor-pointer items-center justify-center rounded-[10px] text-[#5b6678] transition-colors hover:bg-black/5 hover:text-[#0c2a5b] disabled:opacity-50"
            >
              <LogoutIcon />
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
