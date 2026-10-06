import React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, FileText, Plus } from "lucide-react"
import type { PatientRecord } from "../../types"

interface DocumentsTabProps {
  patient: PatientRecord
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ patient }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-bold">
            Uploaded Requirement Attachments
          </CardTitle>
          <CardDescription className="text-xs">
            Verification documents &amp; prescriptions.
          </CardDescription>
        </div>
        <Button
          variant="default"
          size="default"
          className="h-10 px-4 text-sm font-bold gap-2"
        >
          <Plus className="size-4.5" /> Upload Document
        </Button>
      </CardHeader>
      <CardContent>
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">Document Title</TableHead>
              <TableHead className="font-bold">Category</TableHead>
              <TableHead className="font-bold">Upload Date</TableHead>
              <TableHead className="font-bold">File Size</TableHead>
              <TableHead className="font-bold">Verification Status</TableHead>
              <TableHead className="text-right font-bold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patient.documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-bold text-foreground flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  {doc.title}
                </TableCell>
                <TableCell>{doc.category}</TableCell>
                <TableCell>{doc.uploadDate}</TableCell>
                <TableCell className="font-mono font-semibold">{doc.fileSize}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="text-emerald-600 border-emerald-500 text-xs px-2.5 py-0.5"
                  >
                    {doc.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Download"
                  >
                    <Download className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
