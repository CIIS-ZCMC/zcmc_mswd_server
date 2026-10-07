import React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/format-currency"
import type { GuaranteeItem } from "../types"

interface GuaranteeBreakdownTableProps {
  items: GuaranteeItem[]
}

/**
 * A guarantee's breakdown lines, in entry order: Type of Assistance, Amount, Mode of
 * Assistance, Fund Source. Lines recorded before the breakdown rewrite have no type
 * or mode and show "—" until the guarantee is edited.
 */
export const GuaranteeBreakdownTable: React.FC<
  GuaranteeBreakdownTableProps
> = ({ items }) => (
  <div className="overflow-x-auto rounded-md border bg-background">
    <Table>
      <TableHeader className="bg-muted/30">
        <TableRow className="h-7 border-b">
          <TableHead className="h-7 py-1 text-[11px] font-bold">
            Type of Assistance
          </TableHead>
          <TableHead className="h-7 py-1 text-right text-[11px] font-bold">
            Amount
          </TableHead>
          <TableHead className="h-7 py-1 text-[11px] font-bold">
            Mode of Assistance
          </TableHead>
          <TableHead className="h-7 py-1 text-[11px] font-bold">
            Fund Source
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, idx) => (
          <TableRow
            key={item.id ?? idx}
            className="h-8 border-b last:border-b-0"
          >
            <TableCell className="py-1.5 text-xs font-semibold">
              {item.assistanceTypeName ?? (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="py-1.5 text-right text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(item.amount)}
            </TableCell>
            <TableCell className="py-1.5 text-xs">
              {item.modeOfAssistanceName ?? (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="py-1.5 text-xs">
              {item.fundSourceName ?? (
                <span className="text-muted-foreground">—</span>
              )}
              {item.othersSpecify && (
                <span className="ml-1 text-muted-foreground italic">
                  ({item.othersSpecify})
                </span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
)
