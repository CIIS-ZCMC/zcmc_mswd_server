import { useState } from "react"
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Home,
  MessageSquare,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Users,
  AlertCircle,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useProgressNotes, useProgressNoteMutations } from "../hooks/use-progress-notes"
import type { CaseProgressNote, NoteType } from "../types/progress-note.types"

interface ProgressNotesTabProps {
  caseId: number
}

const NOTE_TYPE_CONFIG: Record<
  NoteType,
  { label: string; icon: React.ComponentType<{ className?: string }>; colorClass: string }
> = {
  progress: {
    label: "Progress Note",
    icon: FileText,
    colorClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  },
  home_visit: {
    label: "Home Visit",
    icon: Home,
    colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  phone_follow_up: {
    label: "Phone Follow-up",
    icon: Phone,
    colorClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  },
  conference: {
    label: "Case Conference",
    icon: Users,
    colorClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  },
  referral_follow_up: {
    label: "Referral Follow-up",
    icon: MessageSquare,
    colorClass: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
  },
  other: {
    label: "Other",
    icon: FileText,
    colorClass: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800",
  },
}

export function ProgressNotesTab({ caseId }: ProgressNotesTabProps) {
  const { data: notes = [], isLoading } = useProgressNotes(caseId)
  const { createNote, isCreating, updateNote, isUpdating, deleteNote, completeFollowUp } =
    useProgressNoteMutations(caseId)

  // Composer State
  const [noteType, setNoteType] = useState<NoteType>("progress")
  const [narrative, setNarrative] = useState("")
  const [noteDate, setNoteDate] = useState(() => new Date().toISOString().substring(0, 10))
  const [hasFollowUp, setHasFollowUp] = useState(false)
  const [followUpOn, setFollowUpOn] = useState("")

  // Edit State
  const [editingNote, setEditingNote] = useState<CaseProgressNote | null>(null)
  const [editNarrative, setEditNarrative] = useState("")
  const [editNoteType, setEditNoteType] = useState<NoteType>("progress")
  const [editNoteDate, setEditNoteDate] = useState("")
  const [editFollowUpOn, setEditFollowUpOn] = useState<string>("")

  // Filter State
  const [filterType, setFilterType] = useState<string>("all")

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!narrative.trim()) return

    await createNote({
      note_type: noteType,
      narrative: narrative.trim(),
      note_date: noteDate,
      follow_up_on: hasFollowUp && followUpOn ? followUpOn : null,
    })

    setNarrative("")
    setHasFollowUp(false)
    setFollowUpOn("")
  }

  const openEditDialog = (note: CaseProgressNote) => {
    setEditingNote(note)
    setEditNarrative(note.narrative)
    setEditNoteType(note.noteType)
    setEditNoteDate(note.noteDate ? note.noteDate.substring(0, 10) : "")
    setEditFollowUpOn(note.followUpOn ? note.followUpOn.substring(0, 10) : "")
  }

  const handleUpdateNote = async () => {
    if (!editingNote || !editNarrative.trim()) return

    await updateNote({
      noteId: editingNote.id,
      payload: {
        note_type: editNoteType,
        narrative: editNarrative.trim(),
        note_date: editNoteDate,
        follow_up_on: editFollowUpOn || null,
      },
    })
    setEditingNote(null)
  }

  const handleDelete = async (noteId: number) => {
    if (window.confirm("Are you sure you want to delete this progress note?")) {
      await deleteNote(noteId)
    }
  }

  const todayStr = new Date().toISOString().substring(0, 10)

  const filteredNotes = notes.filter((n) => {
    if (filterType !== "all" && n.noteType !== filterType) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Top Composer Card */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <CardTitle className="text-sm font-bold">Add Progress Note / Case Activity</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Document patient encounters, home visits, multi-disciplinary conferences, and schedule follow-ups.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateNote} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Note Type</Label>
                <Select value={noteType} onValueChange={(val) => setNoteType((val || "progress") as NoteType)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="progress">Progress Note</SelectItem>
                    <SelectItem value="home_visit">Home Visit</SelectItem>
                    <SelectItem value="phone_follow_up">Phone Follow-up</SelectItem>
                    <SelectItem value="conference">Case Conference</SelectItem>
                    <SelectItem value="referral_follow_up">Referral Follow-up</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Note Date</Label>
                <Input
                  type="date"
                  value={noteDate}
                  onChange={(e) => setNoteDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Narrative & Observations</Label>
              <Textarea
                placeholder="Enter detailed case progress notes, interventions, assessments, or findings..."
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                className="text-xs sm:text-sm min-h-[90px] resize-y"
                required
              />
            </div>

            <div className="p-3 bg-muted/30 rounded-lg border border-border/60 space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="schedule-followup"
                  checked={hasFollowUp}
                  onCheckedChange={(checked) => setHasFollowUp(Boolean(checked))}
                />
                <label
                  htmlFor="schedule-followup"
                  className="text-xs font-medium leading-none cursor-pointer flex items-center gap-1.5"
                >
                  <Clock className="size-3.5 text-amber-600" />
                  Schedule a Follow-up Date for this Case
                </label>
              </div>

              {hasFollowUp && (
                <div className="pl-6 pt-1 max-w-xs space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Follow-up Target Date</Label>
                  <Input
                    type="date"
                    value={followUpOn}
                    onChange={(e) => setFollowUpOn(e.target.value)}
                    min={todayStr}
                    className="h-8 text-xs"
                    required={hasFollowUp}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                size="sm"
                disabled={isCreating || !narrative.trim()}
                className="gap-1.5 text-xs font-bold px-4"
              >
                <Plus className="size-3.5" />
                {isCreating ? "Saving Note..." : "Add Progress Note"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Note Timeline List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            <h3 className="font-bold text-sm">Case Notes Stream ({notes.length})</h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filter:</span>
            <Select value={filterType} onValueChange={(val) => setFilterType(val || "all")}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="progress">Progress Notes</SelectItem>
                <SelectItem value="home_visit">Home Visits</SelectItem>
                <SelectItem value="phone_follow_up">Phone Calls</SelectItem>
                <SelectItem value="conference">Conferences</SelectItem>
                <SelectItem value="referral_follow_up">Referrals</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
            Loading progress notes...
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="py-10 text-center rounded-xl border border-dashed p-6 bg-card/40">
            <FileText className="size-8 mx-auto text-muted-foreground/50 mb-2" />
            <div className="text-xs font-semibold text-foreground">No progress notes found</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Use the form above to record your first note or encounter for this case.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotes.map((note) => {
              const cfg = NOTE_TYPE_CONFIG[note.noteType] || NOTE_TYPE_CONFIG.progress
              const Icon = cfg.icon
              const isOverdue =
                note.followUpOn &&
                !note.followUpCompletedAt &&
                note.followUpOn.substring(0, 10) < todayStr
              const isPending =
                note.followUpOn &&
                !note.followUpCompletedAt &&
                note.followUpOn.substring(0, 10) >= todayStr
              const isDone = Boolean(note.followUpCompletedAt)

              return (
                <div
                  key={note.id}
                  className="rounded-xl border bg-card/60 p-4 transition-all hover:shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs font-semibold px-2.5 py-0.5 gap-1.5 border ${cfg.colorClass}`}
                      >
                        <Icon className="size-3" />
                        {cfg.label}
                      </Badge>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Calendar className="size-3.5" />
                        <span>{note.noteDate ? note.noteDate.substring(0, 10) : "—"}</span>
                      </div>

                      {note.authorName && (
                        <div className="text-xs text-muted-foreground">
                          by <strong className="text-foreground">{note.authorName}</strong>
                        </div>
                      )}
                    </div>

                    {note.isEditable && (
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                          <MoreVertical className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(note)} className="gap-2 text-xs">
                            <Pencil className="size-3.5" /> Edit Note
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(note.id)}
                            className="gap-2 text-xs text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-3.5" /> Delete Note
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Narrative Body */}
                  <div className="text-xs sm:text-sm text-foreground whitespace-pre-line leading-relaxed pl-1">
                    {note.narrative}
                  </div>

                  {/* Follow-up Status Bar */}
                  {note.followUpOn && (
                    <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        {isDone && (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] gap-1"
                          >
                            <CheckCircle2 className="size-3 text-emerald-600" />
                            Follow-up Completed ({note.followUpCompletedAt?.substring(0, 10)})
                          </Badge>
                        )}
                        {isOverdue && (
                          <Badge
                            variant="destructive"
                            className="text-[11px] gap-1 animate-pulse"
                          >
                            <AlertCircle className="size-3" />
                            Overdue Follow-up: {note.followUpOn.substring(0, 10)}
                          </Badge>
                        )}
                        {isPending && (
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 text-[11px] gap-1"
                          >
                            <Clock className="size-3 text-amber-600" />
                            Follow-up Scheduled: {note.followUpOn.substring(0, 10)}
                          </Badge>
                        )}
                      </div>

                      {!isDone && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => completeFollowUp(note.id)}
                          className="h-7 text-[11px] font-semibold gap-1 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200 dark:border-emerald-800"
                        >
                          <CheckCircle2 className="size-3" /> Mark Follow-up Done
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit Note Dialog */}
      <Dialog open={Boolean(editingNote)} onOpenChange={(open) => !open && setEditingNote(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Edit Progress Note</DialogTitle>
            <DialogDescription className="text-xs">
              Update note details, narrative observations, or follow-up schedule.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Note Type</Label>
                <Select
                  value={editNoteType}
                  onValueChange={(val) => setEditNoteType((val || "progress") as NoteType)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="progress">Progress Note</SelectItem>
                    <SelectItem value="home_visit">Home Visit</SelectItem>
                    <SelectItem value="phone_follow_up">Phone Follow-up</SelectItem>
                    <SelectItem value="conference">Case Conference</SelectItem>
                    <SelectItem value="referral_follow_up">Referral Follow-up</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Note Date</Label>
                <Input
                  type="date"
                  value={editNoteDate}
                  onChange={(e) => setEditNoteDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Narrative</Label>
              <Textarea
                value={editNarrative}
                onChange={(e) => setEditNarrative(e.target.value)}
                className="text-xs sm:text-sm min-h-[100px] resize-y"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Follow-up Target Date (optional)</Label>
              <Input
                type="date"
                value={editFollowUpOn}
                onChange={(e) => setEditFollowUpOn(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingNote(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isUpdating || !editNarrative.trim()}
              onClick={handleUpdateNote}
              className="text-xs font-bold"
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
