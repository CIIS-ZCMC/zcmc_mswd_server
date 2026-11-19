import React from "react"
import { Link } from "@inertiajs/react"
import { Check, Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api-client"
import { useApproveGuarantee, usePendingApprovals } from "../hooks/use-approvals"

function money(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function shortDate(raw: string): string {
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/**
 * Guarantees at or above the approval amount, waiting for a Head or Supervisor to
 * sign them off. Their Acknowledgement Slips cannot print until they are approved.
 */
export const ApprovalsPage: React.FC = () => {
  const { data, isLoading, isError } = usePendingApprovals()
  const approve = useApproveGuarantee()

  const handleApprove = (id: number, patientName: string) => {
    approve.mutate(id, {
      onSuccess: () =>
        toast.add({
          title: "Guarantee approved",
          description: `${patientName}'s guarantee can now be printed.`,
          type: "success",
        }),
      onError: (err) =>
        toast.add({
          title: "Not approved",
          description:
            err instanceof ApiError
              ? err.firstValidationMessage || err.message
              : "The guarantee could not be approved.",
          type: "error",
        }),
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Approvals
        </h1>
        <p className="text-sm text-muted-foreground">
          {data
            ? `Guarantees of ${money(data.threshold)} or more wait here for a sign-off before their letters print.`
            : "Guarantees waiting for a sign-off."}
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isError ? (
            <p className="p-6 text-sm text-destructive">
              The approvals could not be loaded. Try again shortly.
            </p>
          ) : !data || data.data.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <ShieldCheck className="size-8 text-muted-foreground" />
              <p className="font-semibold text-foreground">
                Nothing is waiting for approval
              </p>
              <p className="text-sm text-muted-foreground">
                New guarantees at or above the amount will show up here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Guarantor</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Recorded by</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Approve</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((row) => {
                  const name = row.patient?.name ?? "Patient"
                  const pending =
                    approve.isPending && approve.variables === row.id

                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.patient ? (
                          <Link
                            href={`/patients/${row.patient.id}`}
                            className="text-primary hover:underline"
                          >
                            {name}
                          </Link>
                        ) : (
                          name
                        )}
                        {row.patient?.hospitalId != null && (
                          <span className="block text-xs font-normal text-muted-foreground">
                            Hosp {row.patient.hospitalId}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{row.guarantor ?? "—"}</TableCell>
                      <TableCell>{row.referenceNo ?? "—"}</TableCell>
                      <TableCell>{shortDate(row.guaranteedOn)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {money(row.total)}
                      </TableCell>
                      <TableCell>{row.recordedBy ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          disabled={approve.isPending}
                          onClick={() => handleApprove(row.id, name)}
                        >
                          {pending ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Check className="size-4" />
                          )}
                          Approve
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
