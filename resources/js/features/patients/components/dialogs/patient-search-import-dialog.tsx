import React, { useState, useEffect, useCallback, useTransition } from "react"
import { router } from "@inertiajs/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Kbd } from "@/components/ui/kbd"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { useRegistryQuickSearch } from "@/features/patients/hooks/use-registry-quick-search"
import { useHospitalPatientSearch } from "@/features/hospital/hooks/use-hospital-patient-search"
import { useImportHospitalPatient } from "@/features/hospital/hooks/use-import-hospital-patient"
import { computeAge } from "@/features/patients/api/patients-adapter"
import type { ApiPatient } from "@/features/patients/types/api.types"
import type { ApiHospitalPatient } from "@/features/hospital/types/api.types"
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSearch,
  Loader2,
  Search,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react"

interface PatientSearchImportDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const PatientSearchImportDialog: React.FC<
  PatientSearchImportDialogProps
> = ({ isOpen, onClose }) => {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [hisPage, setHisPage] = useState(1)
  // The HIS row whose import is awaiting confirmation (a wrong click must not
  // create a registry record).
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [, startTransition] = useTransition()

  const canCreate = usePermission("patients.create")

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setDebouncedSearch(search)
        setHisPage(1)
        setConfirmingId(null)
      })
    }, 280)

    return () => clearTimeout(timer)
  }, [search])

  // Reset search when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearch("")
      setDebouncedSearch("")
      setHisPage(1)
      setConfirmingId(null)
    }
  }, [isOpen])

  // Queries
  const trimmedSearch = debouncedSearch.trim()
  const isSearchActive = trimmedSearch.length >= 2

  const registryQuery = useRegistryQuickSearch(debouncedSearch)
  const hisQuery = useHospitalPatientSearch({
    search: debouncedSearch,
    page: hisPage,
    perPage: 5,
    enabled: isOpen && isSearchActive,
  })

  const importMutation = useImportHospitalPatient()

  const handleSelectLocalPatient = useCallback(
    (patientId: number) => {
      onClose()
      router.visit(`/patients/${patientId}`, {
        preserveState: true,
        preserveScroll: true,
      })
    },
    [onClose]
  )

  const handleImportPatient = useCallback(
    (hisPatient: ApiHospitalPatient) => {
      if (importMutation.isPending) return

      importMutation.mutate(
        { id: hisPatient.id },
        {
          onSuccess: (newPatient) => {
            onClose()
            router.visit(`/patients/${newPatient.id}`, {
              preserveState: true,
              preserveScroll: true,
            })
          },
        }
      )
    },
    [importMutation, onClose]
  )

  const localPatients: ApiPatient[] = registryQuery.data?.data ?? []
  const hisPatients: ApiHospitalPatient[] = hisQuery.data?.data ?? []
  const hisMeta = hisQuery.data?.meta
  const hisTotalPages = hisMeta?.last_page ?? 1
  const hisTotal = hisMeta?.total ?? 0

  const isAnyLoading =
    (isSearchActive && registryQuery.isLoading) ||
    (isSearchActive && hisQuery.isLoading)

  const hasNoResults =
    isSearchActive &&
    !isAnyLoading &&
    localPatients.length === 0 &&
    hisPatients.length === 0 &&
    !hisQuery.isError

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-full max-w-3xl gap-0 overflow-hidden rounded-2xl border border-border bg-card p-0 text-card-foreground shadow-2xl sm:rounded-2xl"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search or Import Patient</DialogTitle>
          <DialogDescription>
            Search patient records across local MSWD registry and Hospital
            Information System (HIS).
          </DialogDescription>
        </DialogHeader>

        {/* The input lives inside <Command> so cmdk sees its arrow/Enter keys. */}
        <Command
          shouldFilter={false}
          className="max-h-[80vh] rounded-none bg-transparent p-0"
        >
          {/* Top Search Bar */}
          <div className="flex items-center border-b border-border bg-muted/20 px-4 py-3">
            <InputGroup className="h-11 w-full rounded-xl border border-input bg-background px-3 shadow-2xs transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/40">
              <InputGroupAddon className="mr-1 text-muted-foreground">
                <Search className="size-4.5 text-primary" />
              </InputGroupAddon>
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Name, Hospital No. (patid), or MSWD ID..."
                className="w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/70"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-7 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </Button>
              )}
              <div className="ml-2 flex items-center gap-1.5 border-l border-border/80 pl-2.5">
                <Kbd className="bg-muted/60 text-[10px]">ESC</Kbd>
              </div>
            </InputGroup>
          </div>

          {/* Command List & Body */}
          <CommandList className="max-h-[68vh] space-y-4 overflow-y-auto p-3">
            {/* Guide hint when < 2 characters */}
            {!isSearchActive && (
              <div className="space-y-3 px-6 py-10 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
                  <Sparkles className="size-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Search Registry & Hospital System
                  </h4>
                  <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                    Type at least 2 characters of the patient's name, hospital
                    number (patid), or MSWD ID to search simultaneously across
                    local and HIS databases.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2 text-[11px] text-muted-foreground/80">
                  <span className="flex items-center gap-1">
                    <Kbd className="text-[10px]">↑</Kbd>{" "}
                    <Kbd className="text-[10px]">↓</Kbd> to navigate
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Kbd className="text-[10px]">↵</Kbd> to select
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Kbd className="text-[10px]">Esc</Kbd> to close
                  </span>
                </div>
              </div>
            )}

            {/* Overall No Results */}
            {hasNoResults && (
              <CommandEmpty className="py-12 text-center">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <FileSearch className="size-6" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  No records found
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  No matches for &ldquo;
                  <span className="font-medium text-foreground">
                    {trimmedSearch}
                  </span>
                  &rdquo; in MSWD Registry or Hospital (HIS).
                </p>
              </CommandEmpty>
            )}

            {/* SECTION 1: MSWD REGISTRY */}
            {isSearchActive && (
              <CommandGroup
                heading={
                  <div className="flex items-center justify-between px-1 pb-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-foreground uppercase">
                      <Users className="size-3.5 text-primary" />
                      <span>In MSWD Registry</span>
                      {localPatients.length > 0 && (
                        <Badge
                          variant="secondary"
                          className="h-4.5 px-1.5 text-[10px] font-semibold"
                        >
                          {localPatients.length}
                        </Badge>
                      )}
                    </div>
                    {registryQuery.isFetching && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Loader2 className="size-3 animate-spin text-primary" />{" "}
                        Searching...
                      </span>
                    )}
                  </div>
                }
              >
                {registryQuery.isLoading ? (
                  <div className="space-y-2 p-1">
                    <Skeleton className="h-14 w-full rounded-xl" />
                    <Skeleton className="h-14 w-full rounded-xl" />
                  </div>
                ) : localPatients.length === 0 ? (
                  <div className="rounded-lg bg-muted/30 px-3 py-3 text-center text-xs text-muted-foreground">
                    No registered patients matching &ldquo;{trimmedSearch}
                    &rdquo;
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {localPatients.map((p) => {
                      const fullName = [
                        p.last_name,
                        p.first_name,
                        p.middle_name,
                      ]
                        .filter(Boolean)
                        .join(", ")

                      return (
                        <CommandItem
                          key={`local-${p.id}`}
                          value={`local-${p.id}-${fullName}-${p.hospital_id ?? ""}-${p.mswd_id ?? ""}`}
                          onSelect={() => handleSelectLocalPatient(p.id)}
                          className="group flex cursor-pointer items-center justify-between rounded-xl border border-border/60 bg-card p-3 transition-all hover:border-primary/40 hover:bg-primary/5 [&>svg:last-child]:hidden"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                              <User className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate text-sm font-semibold text-foreground">
                                  {fullName}
                                </span>
                                {p.mswd_id && (
                                  <Badge
                                    variant="outline"
                                    className="h-4.5 border-primary/30 px-1.5 py-0 font-mono text-[10px] font-medium text-primary"
                                  >
                                    MSWD #{p.mswd_id}
                                  </Badge>
                                )}
                                {p.hospital_id && (
                                  <Badge
                                    variant="secondary"
                                    className="h-4.5 px-1.5 py-0 font-mono text-[10px] text-muted-foreground"
                                  >
                                    Hosp #{p.hospital_id}
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-0.5 flex items-center gap-2 truncate text-xs text-muted-foreground">
                                <span>
                                  {p.sex
                                    ? p.sex.charAt(0).toUpperCase() +
                                      p.sex.slice(1)
                                    : "—"}
                                </span>
                                <span>•</span>
                                <span>
                                  {p.birthdate
                                    ? `${p.birthdate.slice(0, 10)} (${p.estimated_age ?? computeAge(p.birthdate)} yrs)`
                                    : "Age: —"}
                                </span>
                                {p.permanent_address && (
                                  <>
                                    <span>•</span>
                                    <span className="max-w-xs truncate">
                                      {p.permanent_address}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="ml-auto flex shrink-0 items-center gap-2 pl-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs font-semibold transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground"
                            >
                              <span>Open Profile</span>
                              <ArrowRight className="size-3.5" />
                            </Button>
                          </div>
                        </CommandItem>
                      )
                    })}
                  </div>
                )}
              </CommandGroup>
            )}

            {isSearchActive && <CommandSeparator className="my-2" />}

            {/* SECTION 2: HOSPITAL INFORMATION SYSTEM (HIS) */}
            {isSearchActive && (
              <CommandGroup
                heading={
                  <div className="flex items-center justify-between px-1 pb-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-foreground uppercase">
                      <Building2 className="size-3.5 text-indigo-500" />
                      <span>From Hospital / Bizbox (HIS)</span>
                      {hisTotal > 0 && (
                        <Badge
                          variant="secondary"
                          className="h-4.5 px-1.5 text-[10px] font-semibold"
                        >
                          {hisTotal} found
                        </Badge>
                      )}
                    </div>
                    {hisQuery.isFetching && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Loader2 className="size-3 animate-spin text-indigo-500" />{" "}
                        Querying HIS...
                      </span>
                    )}
                  </div>
                }
              >
                {/* HIS Downtime Alert */}
                {hisQuery.isError && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                    <div>
                      <span className="font-bold">
                        Hospital Information System Unreachable
                      </span>
                      <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                        Unable to connect to Bizbox / SQL Server database. MSWD
                        registry search above remains active.
                      </p>
                    </div>
                  </div>
                )}

                {hisQuery.isLoading ? (
                  <div className="space-y-2 p-1">
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                  </div>
                ) : !hisQuery.isError && hisPatients.length === 0 ? (
                  <div className="rounded-lg bg-muted/30 px-3 py-3 text-center text-xs text-muted-foreground">
                    No hospital records found in HIS for &ldquo;{trimmedSearch}
                    &rdquo;
                  </div>
                ) : (
                  !hisQuery.isError && (
                    <div className="space-y-1.5">
                      {hisPatients.map((hp) => {
                        const isRegistered =
                          hp.local_patient_id !== null &&
                          hp.local_patient_id !== undefined
                        const pData = hp.personal_data
                        const sexFormatted = pData?.sex
                          ? pData.sex.charAt(0).toUpperCase() +
                            pData.sex.slice(1)
                          : "—"
                        const birthdateStr = pData?.birthdate ?? "—"
                        const addressStr = pData?.permanent_address ?? "—"
                        const isRowImporting =
                          importMutation.isPending &&
                          importMutation.variables?.id === hp.id

                        const isConfirming = confirmingId === hp.id

                        return (
                          <React.Fragment key={`his-${hp.id}`}>
                            <CommandItem
                              value={`his-${hp.id}-${hp.display_name}-${hp.hospital_number ?? ""}`}
                              onSelect={() => {
                                // Enter / click runs the row's main action: open a
                                // registered patient, else review the import, and a
                                // second Enter on the reviewed row imports it.
                                if (isRegistered && hp.local_patient_id) {
                                  handleSelectLocalPatient(hp.local_patient_id)
                                } else if (canCreate) {
                                  if (isConfirming) handleImportPatient(hp)
                                  else setConfirmingId(hp.id)
                                }
                              }}
                              className="group flex items-center justify-between rounded-xl border border-border/60 bg-card p-3 transition-all hover:border-indigo-500/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 [&>svg:last-child]:hidden"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                  <Building2 className="size-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="truncate text-sm font-semibold text-foreground">
                                      {hp.display_name}
                                    </span>
                                    {hp.hospital_number && (
                                      <Badge
                                        variant="outline"
                                        className="h-4.5 border-indigo-500/30 px-1.5 py-0 font-mono text-[10px] text-indigo-600 dark:text-indigo-400"
                                      >
                                        Hosp #{hp.hospital_number}
                                      </Badge>
                                    )}
                                    {isRegistered && (
                                      <Badge
                                        variant="default"
                                        className="h-4.5 gap-1 bg-emerald-600 px-1.5 py-0 text-[10px] font-medium text-white"
                                      >
                                        <CheckCircle2 className="size-2.5" />{" "}
                                        Registered
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="mt-0.5 flex items-center gap-2 truncate text-xs text-muted-foreground">
                                    <span>Sex: {sexFormatted}</span>
                                    <span>•</span>
                                    <span>DOB: {birthdateStr}</span>
                                    {addressStr !== "—" && (
                                      <>
                                        <span>•</span>
                                        <span className="max-w-xs truncate">
                                          {addressStr}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="ml-auto flex shrink-0 items-center gap-2 pl-3">
                                {isRegistered ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1.5 text-xs font-semibold group-hover:border-indigo-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                                    onClick={(e) => {
                                      // The item's onSelect fires on this click too; stop it visiting twice.
                                      e.stopPropagation()
                                      if (hp.local_patient_id)
                                        handleSelectLocalPatient(
                                          hp.local_patient_id
                                        )
                                    }}
                                  >
                                    <span>Open</span>
                                    <ArrowRight className="size-3.5" />
                                  </Button>
                                ) : canCreate ? (
                                  <Button
                                    size="sm"
                                    disabled={isRowImporting || isConfirming}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setConfirmingId(hp.id)
                                    }}
                                    className="h-8 gap-1.5 bg-primary text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90"
                                  >
                                    {isRowImporting ? (
                                      <>
                                        <Loader2 className="size-3.5 animate-spin" />
                                        <span>Importing...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Download className="size-3.5" />
                                        <span>Import to MSWD</span>
                                      </>
                                    )}
                                  </Button>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-xs text-muted-foreground"
                                  >
                                    Not in MSWD
                                  </Badge>
                                )}
                              </div>
                            </CommandItem>
                            {isConfirming && (
                              <ImportConfirmPanel
                                hisPatient={hp}
                                isImporting={isRowImporting}
                                onConfirm={() => handleImportPatient(hp)}
                                onCancel={() => setConfirmingId(null)}
                              />
                            )}
                          </React.Fragment>
                        )
                      })}
                    </div>
                  )
                )}

                {/* HIS Compact Pagination */}
                {!hisQuery.isError && hisTotalPages > 1 && (
                  <div className="flex items-center justify-between px-1 pt-2 text-xs text-muted-foreground">
                    <span>
                      Page{" "}
                      <strong className="text-foreground">{hisPage}</strong> of{" "}
                      {hisTotalPages} ({hisTotal} total)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon-xs"
                        disabled={hisPage <= 1 || hisQuery.isFetching}
                        onClick={() =>
                          setHisPage((prev) => Math.max(1, prev - 1))
                        }
                        className="size-7"
                        aria-label="Previous HIS page"
                      >
                        <ChevronLeft className="size-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon-xs"
                        disabled={
                          hisPage >= hisTotalPages || hisQuery.isFetching
                        }
                        onClick={() => setHisPage((prev) => prev + 1)}
                        className="size-7"
                        aria-label="Next HIS page"
                      >
                        <ChevronRight className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-muted/10 px-4 py-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-emerald-500" />
            <span>Real-time cross-database search</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 px-2.5 text-xs"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface ImportConfirmPanelProps {
  hisPatient: ApiHospitalPatient
  isImporting: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Review step before an import: the HIS personal data the server will copy
 * into the new registry record (HospitalPatient::toPatientAttributes()).
 */
const ImportConfirmPanel: React.FC<ImportConfirmPanelProps> = ({
  hisPatient,
  isImporting,
  onConfirm,
  onCancel,
}) => {
  const data = hisPatient.personal_data
  const fields: Array<[string, string | null | undefined]> = [
    ["Last name", data?.last_name],
    ["First name", data?.first_name],
    ["Middle name", data?.middle_name],
    ["Suffix", data?.extension_name],
    ["Sex", data?.sex],
    ["Birthdate", data?.birthdate],
    ["Civil status", data?.civil_status],
    ["Contact no.", data?.contact_number],
    ["Address", data?.permanent_address],
  ]

  return (
    <div className="ml-12 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
      <p className="font-semibold text-foreground">
        Import {hisPatient.display_name} into the MSWD registry?
      </p>
      <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label} className="flex min-w-0 gap-2">
            <dt className="w-24 shrink-0 text-muted-foreground">{label}</dt>
            <dd className="truncate font-medium text-foreground capitalize">
              {value || "—"}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex items-center justify-end gap-2">
        <span className="mr-auto text-[11px] text-muted-foreground">
          Press <Kbd className="text-[10px]">↵</Kbd> again to import
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={onCancel}
          disabled={isImporting}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs font-bold"
          onClick={onConfirm}
          disabled={isImporting}
        >
          {isImporting ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              <span>Importing...</span>
            </>
          ) : (
            <>
              <Download className="size-3.5" />
              <span>Confirm import</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
