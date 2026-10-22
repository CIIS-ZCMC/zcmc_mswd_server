import React, { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { useQueueActionGate } from "@/features/queue"
import { useDocumentTypeOptions } from "@/features/library/hooks/use-lookup-options"
import { Download, Eye, FileImage, FileText, Plus, Trash2 } from "lucide-react"
import { openPatientDocument } from "../../api/documents-api"
import {
  usePatientDocumentMutations,
  usePatientDocuments,
} from "../../hooks/use-patient-documents"
import type { DocumentItem, PatientRecord } from "../../types"
import { UploadDocumentDialog } from "../dialogs/upload-document-dialog"

interface DocumentsTabProps {
  patient: PatientRecord
}

const ALL_TYPES = "all"

const messageOf = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/**
 * Everything uploaded for the patient: PDFs and scans of IDs, certificates, medical
 * abstracts and the like. Anyone who can see the patient can open a file; uploading
 * and deleting need `patients.update`. A document may be filed under one of the
 * patient's cases, but does not have to be.
 */
export const DocumentsTab: React.FC<DocumentsTabProps> = ({ patient }) => {
  const patientId = Number(patient.id)
  const canManage = usePermission("patients.update")
  const { canPerformActions, reason } = useQueueActionGate()

  const [typeFilter, setTypeFilter] = useState(ALL_TYPES)
  const filters =
    typeFilter === ALL_TYPES ? {} : { documentTypeId: Number(typeFilter) }
  const {
    data: documents = [],
    isLoading,
    isError,
  } = usePatientDocuments(patientId, filters)
  const { data: typeOptions = [] } = useDocumentTypeOptions(false)
  const { upload, remove } = usePatientDocumentMutations(patientId)

  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [deleting, setDeleting] = useState<DocumentItem | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const open = async (doc: DocumentItem, download: boolean) => {
    setErrorMessage(null)
    setBusyId(doc.id)
    try {
      await openPatientDocument(patientId, doc, { download })
    } catch (err) {
      setErrorMessage(messageOf(err, "The file could not be opened."))
    } finally {
      setBusyId(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setErrorMessage(null)
    try {
      await remove.mutateAsync(deleting.id)
    } catch (err) {
      setErrorMessage(messageOf(err, "The document could not be deleted."))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base font-bold">
            Uploaded Documents
          </CardTitle>
          <CardDescription className="text-xs">
            IDs, certificates, medical abstracts and other requirements filed
            for this patient.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v ?? ALL_TYPES)}
          >
            <SelectTrigger
              className="h-10 w-52"
              aria-label="Filter by document type"
            >
              <SelectValue>
                {(value: string | null) =>
                  typeOptions.find((o) => o.value === value)?.label ??
                  "All types"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TYPES}>All types</SelectItem>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManage && (
            <Button
              variant="default"
              size="default"
              disabled={!canPerformActions}
              title={!canPerformActions ? reason : undefined}
              className="h-10 gap-2 px-4 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setIsUploadOpen(true)}
            >
              <Plus className="size-4.5" /> Upload Document
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {errorMessage && (
          <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Spinner className="size-4" /> Loading documents…
          </div>
        ) : isError ? (
          <p className="py-10 text-center text-sm text-destructive">
            The documents could not be loaded.
          </p>
        ) : documents.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {typeFilter === ALL_TYPES
              ? "No documents have been uploaded for this patient yet."
              : "No documents of this type."}
          </p>
        ) : (
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">File</TableHead>
                <TableHead className="font-bold">Type</TableHead>
                <TableHead className="font-bold">Case</TableHead>
                <TableHead className="font-bold">Uploaded By</TableHead>
                <TableHead className="font-bold">Date</TableHead>
                <TableHead className="font-bold">Size</TableHead>
                <TableHead className="text-right font-bold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => {
                const FileIcon = doc.fileType.startsWith("image/")
                  ? FileImage
                  : FileText
                const busy = busyId === doc.id
                return (
                  <TableRow key={doc.id}>
                    <TableCell className="font-bold text-foreground">
                      <span className="flex items-center gap-2">
                        <FileIcon className="size-4 shrink-0 text-primary" />
                        <span className="break-all">{doc.fileName}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="px-2.5 py-0.5 text-xs"
                      >
                        {doc.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {doc.caseCode ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {doc.uploadedByName ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(doc.uploadedAt)}
                    </TableCell>
                    <TableCell className="font-mono font-semibold whitespace-nowrap">
                      {formatFileSize(doc.fileSize)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              aria-label={`View ${doc.fileName}`}
                              disabled={busy}
                              onClick={() => open(doc, false)}
                            />
                          }
                        >
                          {busy ? (
                            <Spinner className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </TooltipTrigger>
                        <TooltipContent>View</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              aria-label={`Download ${doc.fileName}`}
                              disabled={busy}
                              onClick={() => open(doc, true)}
                            />
                          }
                        >
                          <Download className="size-4" />
                        </TooltipTrigger>
                        <TooltipContent>Download</TooltipContent>
                      </Tooltip>
                      {canManage && (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={!canPerformActions}
                                title={!canPerformActions ? reason : undefined}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label={`Delete ${doc.fileName}`}
                                onClick={() => setDeleting(doc)}
                              />
                            }
                          >
                            <Trash2 className="size-4" />
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <UploadDocumentDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        cases={patient.allCases ?? []}
        onUpload={(input) => upload.mutateAsync(input)}
        isUploading={upload.isPending}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(isOpen) => !isOpen && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="break-all">{deleting?.fileName}</strong> will
              be removed from the patient&apos;s documents. The deletion is
              recorded in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDelete}
              disabled={remove.isPending}
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
