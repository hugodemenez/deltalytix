"use client";

import React from "react";
import { flexRender, Row, Table } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

const ROW_HEIGHT_ESTIMATE = 44;
const ROW_HEIGHT_ESTIMATE_COMPACT = 36;
const VIRTUAL_OVERSCAN = 10;

interface TradeTableVirtualBodyProps<TData> {
  table: Table<TData>;
  scrollElementRef: React.RefObject<HTMLDivElement | null>;
  columnCount: number;
  compact?: boolean;
}

function TradeTableBodyRow<TData>({
  row,
  rowIndex,
  compact = false,
}: {
  row: Row<TData>;
  rowIndex: number;
  compact?: boolean;
}) {
  return (
    <tr
      data-state={row.getIsSelected() && "selected"}
      className={cn(
        "border-b border-border transition-colors duration-75 hover:bg-muted/40 group",
        row.getIsSelected() &&
          "bg-accent/50 hover:bg-accent data-[state=selected]:bg-muted",
        row.getIsExpanded()
          ? "bg-muted/60"
          : row.getCanExpand()
            ? "bg-background"
            : "bg-muted/30",
        rowIndex % 2 === 1 && !row.getIsSelected() && "bg-muted/20",
      )}
    >
      {row.getVisibleCells().map((cell) => (
        <td
          key={cell.id}
          className={cn(
            "align-middle [&:has([role=checkbox])]:pr-0 whitespace-nowrap border-r border-border/50 last:border-r-0 first:border-l group-hover:border-border",
            compact
              ? "px-2 py-1.5 text-xs"
              : "p-4 px-3 py-2 text-sm",
            row.getIsSelected() && "border-border",
          )}
          style={{ width: cell.column.getSize() }}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
}

export function TradeTableVirtualBody<TData>({
  table,
  scrollElementRef,
  columnCount,
  compact = false,
}: TradeTableVirtualBodyProps<TData>) {
  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () =>
      compact ? ROW_HEIGHT_ESTIMATE_COMPACT : ROW_HEIGHT_ESTIMATE,
    overscan: VIRTUAL_OVERSCAN,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0;

  if (rows.length === 0) {
    return (
      <tbody className="bg-background [&_tr:last-child]:border-0">
        <tr>
          <td
            colSpan={columnCount}
            className="p-4 align-middle [&:has([role=checkbox])]:pr-0 h-24 text-center"
          >
            No results.
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody className="bg-background [&_tr:last-child]:border-0">
      {paddingTop > 0 && (
        <tr aria-hidden="true">
          <td
            colSpan={columnCount}
            style={{ height: paddingTop, padding: 0, border: 0 }}
          />
        </tr>
      )}
      {virtualRows.map((virtualRow) => {
        const row = rows[virtualRow.index];
        return (
          <TradeTableBodyRow
            key={row.id}
            row={row}
            rowIndex={virtualRow.index}
            compact={compact}
          />
        );
      })}
      {paddingBottom > 0 && (
        <tr aria-hidden="true">
          <td
            colSpan={columnCount}
            style={{ height: paddingBottom, padding: 0, border: 0 }}
          />
        </tr>
      )}
    </tbody>
  );
}
