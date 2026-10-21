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
import { Spinner } from "@/components/ui/spinner"
import { useDocumentTypeOptions } from "@/features/library/hooks/use-lookup-options"
import { ApiError } from "@/lib/api-client"
import type { UploadDocumentInput } from "../../types/document.types"
import type { OpenCase } from "../../types/watcher.types"

const NO_CASE = "none"
const ACCEPTED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"]
const MAX_FILE_BYTES = 10 * 1024 * 1024

interface UploadDocumentDialogProps {
  isOpen: boolean
  onClose: () => void
  /** Every case of the patient; filing under one is optional. */
  cases: OpenCase[]
  onUpload: (input: UploadDocumentInput) => Promise<unknown>
  isUploading?: boolean
}

/** A client-side check mirroring the server's rules, so a bad pick fails before the upload. */
function fileProblem(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return "Only PDF, JPG or PNG files can be uploaded."
  }
  if (file.size > MAX_FILE_BYTES) {
    return "The file is larger than 10 MB."
  }
  return null
}

/**
 * Files a PDF or image under the patient: pick a Library document type, optionally
 * one of the patient's cases, and the file.
 */
export const UploadDocumentDialog: React.FC<UploadDocumentDialogProps> = ({
  isOpen,
  onClose,
  cases,
  onUpload,
  isUploading = false,
}) => {
  const { data: typeOptions = [] } = useDocumentTypeOptions(true)

  const [typeId, setTypeId] = useState("")
  const [caseId, setCaseId] = useState(NO_CASE)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [prevOpen, setPrevOpen] = useState(false)
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen)
    if (isOpen) {
      setTypeId("")
      setCaseId(NO_CASE)
      setFile(null)
      setError(null)
    }
  }

  const canSave = file !== null && typeId !== "" && !isUploading

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null
    const problem = picked ? fileProblem(picked) : null
    setError(problem)
    setFile(problem ? null : picked)
    if (problem) event.target.value = ""
  }

  const handleSave = async () => {
    if (!file || typeId === "") return
    setError(null)
    try {
      await onUpload({
        file,
        documentTypeId: Number(typeId),
        caseId: caseId === NO_CASE ? null : Number(caseId),
      })
      onClose()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (err.firstValidationMessage ?? err.message)
          : "The upload failed. Please try again."
      )
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && !isUploading && onClose()}
    >
      <DialogContent className="w-full max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Upload Document
          </DialogTitle>
          <DialogDescription className="text-xs">
            PDF, JPG or PNG, up to 10 MB. Filing it under a case is optional.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 text-sm">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold">Document type *</Label>
            <Select value={typeId} onValueChange={(v) => setTypeId(v ?? "")}>
              <SelectTrigger className="mt-1 h-10">
                <SelectValue>
                  {(value: string | null) =>
                    typeOptions.find((o) => o.value === value)?.label ??
                    "Select a document type"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold">Case</Label>
            <Select
              value={caseId}
              onValueChange={(v) => setCaseId(v ?? NO_CASE)}
            >
              <SelectTrigger className="mt-1 h-10">
                <SelectValue>
                  {(value: string | null) => {
                    const match = cases.find((c) => String(c.id) === value)
                    return match ? match.caseCode : "No case"
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CASE}>No case</SelectItem>
                {cases.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.caseCode}
                    {c.admissionType ? ` · ${c.admissionType}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="document-file" className="text-xs font-semibold">
              File *
            </Label>
            <Input
              id="document-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={handleFileChange}
              className="mt-1 h-10 bg-background"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave} className="gap-2">
            {isUploading && <Spinner className="size-4" />}
            {isUploading ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
