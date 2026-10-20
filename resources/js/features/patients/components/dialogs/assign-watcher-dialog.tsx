import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useWatcherRelationshipTypes } from "@/features/cases/hooks/use-case-watchers"
import type { CreateCaseWatcherPayload } from "@/features/cases/api/case-watchers-api"
import type { OpenCase, Watcher } from "../../types/watcher.types"

const NEW_PERSON = "new"

interface AssignWatcherDialogProps {
  isOpen: boolean
  onClose: () => void
  /** The patient's open cases. */
  openCases: OpenCase[]
  /** Assign this watcher; when omitted the user picks one (or adds a new person). */
  watcher?: Watcher | null
  /** Assign to this case; when omitted the user picks one of `openCases`. */
  fixedCaseId?: number
  /** The patient's watchers, for the picker when no `watcher` is given. */
  watchers?: Watcher[]
  onAssign: (caseId: number, payload: CreateCaseWatcherPayload) => Promise<void>
  isSubmitting?: boolean
}

function extract10DigitPhone(raw: string): string {
  if (!raw) return ""
  const digits = raw.replace(/\D/g, "")
  if (digits.startsWith("63") && digits.length >= 12) {
    return digits.slice(2, 12)
  }
  if (digits.startsWith("0") && digits.length >= 11) {
    return digits.slice(1, 11)
  }
  return digits.slice(0, 10)
}

/**
 * Assigns a patient's watcher to one of their open cases, with the facts that
 * belong to that case: primary, informant, presence dates and notes. From a
 * case page it can also create a new person and assign them in one step.
 */
export const AssignWatcherDialog: React.FC<AssignWatcherDialogProps> = ({
  isOpen,
  onClose,
  openCases,
  watcher,
  fixedCaseId,
  watchers = [],
  onAssign,
  isSubmitting = false,
}) => {
  const { data: relationshipTypes = [] } = useWatcherRelationshipTypes()

  const relationshipMap = React.useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of relationshipTypes) {
      map[t.code] = t.name
    }
    return map
  }, [relationshipTypes])

  const formatRelationshipLabel = React.useCallback(
    (code: string | null) => {
      if (!code) return ""
      const match = relationshipMap[code]
      if (match) {
        return match.replace(/_/g, " ")
      }
      return code
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    },
    [relationshipMap]
  )

  const [caseId, setCaseId] = useState("")
  const [watcherId, setWatcherId] = useState(NEW_PERSON)
  const [person, setPerson] = useState({
    lastName: "",
    firstName: "",
    middleName: "",
    relationshipCode: "",
    contactNumber: "",
    address: "",
  })
  const [flags, setFlags] = useState({ isPrimary: false, isInformant: false, presentFrom: "", presentUntil: "", notes: "" })
  const [error, setError] = useState<string | null>(null)

  // Cases this watcher is not already on; a case can hold a watcher only once.
  const assignedCaseIds = new Set((watcher?.assignments ?? []).map((a) => a.caseId))
  const availableCases = watcher ? openCases.filter((c) => !assignedCaseIds.has(String(c.id))) : openCases
  const targetCaseId = fixedCaseId ?? (caseId ? Number(caseId) : undefined)

  // Watchers that can still be picked for the target case.
  const pickable = watchers.filter(
    (w) => !w.assignments.some((a) => targetCaseId !== undefined && a.caseId === String(targetCaseId))
  )

  const [prevSyncKey, setPrevSyncKey] = useState<string | null>(null)
  const currentSyncKey = `${watcher?.id ?? "none"}-${fixedCaseId ?? "any"}-${isOpen}`

  if (currentSyncKey !== prevSyncKey) {
    setPrevSyncKey(currentSyncKey)
    setError(null)
    setCaseId(availableCases[0] ? String(availableCases[0].id) : "")
    setWatcherId(watcher ? String(watcher.id) : NEW_PERSON)
    setPerson({
      lastName: "",
      firstName: "",
      middleName: "",
      relationshipCode: relationshipTypes[0]?.code ?? "",
      contactNumber: "",
      address: "",
    })
    setFlags({ isPrimary: false, isInformant: false, presentFrom: "", presentUntil: "", notes: "" })
  }

  const isNewPerson = !watcher && watcherId === NEW_PERSON
  const canSave =
    targetCaseId !== undefined &&
    (isNewPerson
      ? person.lastName.trim() !== "" &&
        person.firstName.trim() !== "" &&
        person.relationshipCode !== "" &&
        person.contactNumber.trim().length === 10 &&
        person.address.trim() !== ""
      : watcherId !== NEW_PERSON)

  const handleSave = async () => {
    if (!canSave || targetCaseId === undefined) return

    const formattedContact = `+63-${person.contactNumber.trim()}`

    const payload: CreateCaseWatcherPayload = {
      ...(isNewPerson
        ? {
            watcher: {
              first_name: person.firstName.trim(),
              middle_name: person.middleName.trim() || null,
              last_name: person.lastName.trim(),
              relationship_code: person.relationshipCode,
              contact_number: formattedContact,
              address: person.address.trim(),
            },
          }
        : { patient_watcher_id: Number(watcher?.id ?? watcherId) }),
      is_primary: flags.isPrimary,
      is_informant: flags.isInformant,
      present_from: flags.presentFrom || null,
      present_until: flags.presentUntil || null,
      notes: flags.notes.trim() || null,
    }

    try {
      setError(null)
      await onAssign(targetCaseId, payload)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to assign watcher")
    }
  }

  const caseLabel = (c: OpenCase) => `${c.caseCode}${c.admissionType ? ` · ${c.admissionType}` : ""}`

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Assign Watcher to Case</DialogTitle>
          <DialogDescription className="text-xs">
            {watcher ? `Assign ${watcher.fullName} to an open case.` : "Choose who watches over the patient on this case."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 text-sm">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {fixedCaseId === undefined && (
            <div>
              <Label className="text-xs font-semibold">Case *</Label>
              {availableCases.length === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  There is no open case this watcher can still be assigned to.
                </p>
              ) : (
                <Select value={caseId} onValueChange={(v) => v && setCaseId(v)}>
                  <SelectTrigger className="mt-1 h-10">
                    <SelectValue placeholder="Select an open case" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCases.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {caseLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {!watcher && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
              <div>
                <Label className="text-xs font-bold">Watcher *</Label>
                <Select value={watcherId} onValueChange={(v) => v && setWatcherId(v)}>
                  <SelectTrigger className="mt-1 h-10 bg-background">
                    <SelectValue placeholder="Choose a watcher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NEW_PERSON}>+ Add a new person</SelectItem>
                    {pickable.map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {w.fullName} ({w.relationship})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isNewPerson && (
                <div className="grid gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      placeholder="Last name *"
                      value={person.lastName}
                      onChange={(e) => setPerson({ ...person, lastName: e.target.value })}
                      className="h-10 bg-background"
                    />
                    <Input
                      placeholder="First name *"
                      value={person.firstName}
                      onChange={(e) => setPerson({ ...person, firstName: e.target.value })}
                      className="h-10 bg-background"
                    />
                    <Input
                      placeholder="Middle name"
                      value={person.middleName}
                      onChange={(e) => setPerson({ ...person, middleName: e.target.value })}
                      className="h-10 bg-background"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      value={person.relationshipCode}
                      onValueChange={(code) => code && setPerson({ ...person, relationshipCode: code })}
                    >
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue placeholder="Relationship *">
                          {(val: string | null) =>
                            val ? formatRelationshipLabel(val) : "Relationship *"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {relationshipTypes.map((type) => (
                          <SelectItem key={type.id} value={type.code}>
                            {formatRelationshipLabel(type.code) || type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-stretch">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted/40 text-muted-foreground text-xs font-bold select-none">
                        +63 -
                      </span>
                      <Input
                        type="tel"
                        inputMode="numeric"
                        placeholder="9XX XXX XXXX"
                        maxLength={10}
                        value={person.contactNumber}
                        onChange={(e) => {
                          const cleaned = extract10DigitPhone(e.target.value)
                          setPerson({ ...person, contactNumber: cleaned })
                        }}
                        className="h-10 rounded-l-none bg-background font-mono tracking-wider"
                      />
                    </div>
                  </div>
                  {person.contactNumber.length > 0 && person.contactNumber.length < 10 && (
                    <p className="-mt-1 text-[11px] text-muted-foreground">
                      10-digit number required ({person.contactNumber.length}/10)
                    </p>
                  )}
                  <Input
                    placeholder="Address *"
                    value={person.address}
                    onChange={(e) => setPerson({ ...person, address: e.target.value })}
                    className="h-10 bg-background"
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold">Primary Watcher</Label>
                <p className="text-[11px] text-muted-foreground">Main contact on this case</p>
              </div>
              <Switch
                checked={flags.isPrimary}
                onCheckedChange={(checked) => setFlags({ ...flags, isPrimary: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold">Informant</Label>
                <p className="text-[11px] text-muted-foreground">Provided case info</p>
              </div>
              <Switch
                checked={flags.isInformant}
                onCheckedChange={(checked) => setFlags({ ...flags, isInformant: checked })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Present From</Label>
              <Input
                type="date"
                value={flags.presentFrom}
                onChange={(e) => setFlags({ ...flags, presentFrom: e.target.value })}
                className="mt-1 h-10"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Present Until</Label>
              <Input
                type="date"
                value={flags.presentUntil}
                onChange={(e) => setFlags({ ...flags, presentUntil: e.target.value })}
                className="mt-1 h-10"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Notes / Remarks</Label>
            <Textarea
              placeholder="Optional remarks for this case..."
              value={flags.notes}
              onChange={(e) => setFlags({ ...flags, notes: e.target.value })}
              className="mt-1 min-h-[60px] text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button className="px-6 font-bold" onClick={handleSave} disabled={isSubmitting || !canSave}>
            {isSubmitting ? "Assigning..." : "Assign Watcher"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
