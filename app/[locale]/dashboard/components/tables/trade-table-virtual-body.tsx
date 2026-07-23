"use client";

import React from "react";
import { flexRender, Row, Table } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

const ROW_HEIGHT_ESTIMATE = 44;
const ROW_HEIGHT_ESTIMATE_COMPACT = 36;
const VIRTUAL_OVERSCAN = 10;
/** Cap non-virtual fallback so a zero-height container can't mount thousands of DOM rows. */
const NON_VIRTUAL_FALLBACK_LIMIT = 100;

interface TradeTableVirtualBodyProps<TData> {
  table: Table<TData>;
  scrollElement: HTMLDivElement | null;
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
  scrollElement,
  columnCount,
  compact = false,
}: TradeTableVirtualBodyProps<TData>) {
  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollElement,
    estimateSize: () =>
      compact ? ROW_HEIGHT_ESTIMATE_COMPACT : ROW_HEIGHT_ESTIMATE,
    overscan: VIRTUAL_OVERSCAN,
    // Prefer a usable first paint before the flex layout settles a real height.
    initialRect: { width: 0, height: 400 },
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0;

  // Remeasure when the scroll parent mounts or rows appear but the range is empty
  // (common when the flex container reports height 0 on the first layout pass).
  React.useLayoutEffect(() => {
    if (!scrollElement || rows.length === 0) return;
    if (virtualRows.length === 0) {
      rowVirtualizer.measure();
    }
  }, [scrollElement, rows.length, virtualRows.length, rowVirtualizer]);

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

  // If the virtualizer still has no range (e.g. height still 0), render a capped
  // non-virtual slice so the table is never blank on init.
  if (virtualRows.length === 0) {
    const fallbackRows = rows.slice(0, NON_VIRTUAL_FALLBACK_LIMIT);
    return (
      <tbody className="bg-background [&_tr:last-child]:border-0">
        {fallbackRows.map((row, rowIndex) => (
          <TradeTableBodyRow
            key={row.id}
            row={row}
            rowIndex={rowIndex}
            compact={compact}
          />
        ))}
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
