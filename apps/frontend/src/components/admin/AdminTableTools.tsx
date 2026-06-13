"use client";

import { Button } from "@/components/ui/button";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import { exportRowsToCsv } from "./useClientTable";

export function AdminSortableHead({
  label,
  sortProps,
  className,
}: {
  label: string;
  sortProps: {
    onClick: () => void;
    "aria-sort": React.AriaAttributes["aria-sort"];
  };
  className?: string;
}) {
  // aria-sort belongs on <th>, not <button> (jsx-a11y/role-supports-aria-props).
  // Callers wrap this in <TableHead aria-sort={sortProps["aria-sort"]}>.
  return (
    <button
      type="button"
      className={cn(
        "flex w-full cursor-pointer select-none items-center gap-1 text-left font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 rounded-sm",
        className,
      )}
      onClick={sortProps.onClick}
    >
      {label}
      <span className="text-[10px] text-muted-foreground" aria-hidden>
        {sortProps["aria-sort"] === "ascending"
          ? "↑"
          : sortProps["aria-sort"] === "descending"
            ? "↓"
            : "↕"}
      </span>
    </button>
  );
}

/** Sortable column header — aria-sort on &lt;th&gt;, not the inner button. */
export function AdminSortableTableHead({
  label,
  sortProps,
  className,
}: {
  label: string;
  sortProps: {
    onClick: () => void;
    "aria-sort": React.AriaAttributes["aria-sort"];
  };
  className?: string;
}) {
  return (
    <TableHead aria-sort={sortProps["aria-sort"]} className={className}>
      <AdminSortableHead label={label} sortProps={sortProps} />
    </TableHead>
  );
}

export function AdminTablePagination({
  page,
  pages,
  onPageChange,
  perPage,
  onPerPageChange,
}: {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  perPage?: number;
  onPerPageChange?: (limit: number) => void;
}) {
  if (pages <= 1 && !onPerPageChange) return null;

  const renderPageNumbers = () => {
    const result = [];
    const maxPagesToShow = 5;
    
    let start = Math.max(1, page - 2);
    let end = Math.min(pages, start + maxPagesToShow - 1);
    
    if (end - start + 1 < maxPagesToShow) {
      start = Math.max(1, end - maxPagesToShow + 1);
    }

    for (let i = start; i <= end; i++) {
      result.push(
        <Button
          key={i}
          type="button"
          variant={i === page ? "default" : "outline"}
          size="sm"
          className="min-h-9 w-9 p-0"
          onClick={() => onPageChange(i)}
        >
          {i}
        </Button>
      );
    }
    return result;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border p-3">
      <div className="flex items-center gap-2">
        {onPerPageChange && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Show:</span>
            <select 
              className="border border-input bg-transparent rounded px-2 py-1 h-9 text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
              value={perPage || 50}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
              <option value={10000}>All</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-9"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
        >
          First
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-9"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </Button>
        
        <div className="hidden md:flex items-center gap-1 mx-2">
          {page > 3 && <span className="text-muted-foreground px-1">...</span>}
          {renderPageNumbers()}
          {page < pages - 2 && <span className="text-muted-foreground px-1">...</span>}
        </div>

        <span className="text-sm text-muted-foreground tabular-nums px-2 md:hidden">
          Page {page} of {pages}
        </span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-9"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-9"
          disabled={page >= pages}
          onClick={() => onPageChange(pages)}
        >
          Last
        </Button>
      </div>
    </div>
  );
}

export function AdminExportButton({
  filename,
  headers,
  rows,
  disabled,
  label = "Export CSV",
}: {
  filename: string;
  headers: string[];
  rows: string[][];
  disabled?: boolean;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-9"
      disabled={disabled || rows.length === 0}
      onClick={() => exportRowsToCsv(filename, headers, rows)}
    >
      {label}
    </Button>
  );
}

export function AdminTableEmptyRow({
  colSpan,
  title,
  description,
}: {
  colSpan: number;
  title: string;
  description?: string;
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan}>
        <EmptyState
          title={title}
          description={description}
          className="border-0 bg-transparent py-10"
        />
      </TableCell>
    </TableRow>
  );
}
