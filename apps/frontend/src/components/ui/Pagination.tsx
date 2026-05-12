"use client";

import { Icon } from "@/components/ui/Icon";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Pages within `siblings` of the current are always shown. Default 1. */
  siblings?: number;
  onChange: (page: number) => void;
}

/**
 * Builds an array describing the page-number row, with `"ellipsis"` entries
 * marking elided ranges. Always includes first and last, current ± siblings,
 * and bridges where the gap is exactly 1 (no point showing "1 … 2 3" when
 * "1 2 3" is shorter and clearer).
 */
function paginationRange(page: number, totalPages: number, siblings: number): (number | "ellipsis")[] {
  const totalNumbers = siblings * 2 + 5; // first, last, current, two siblings, two ellipses
  if (totalPages <= totalNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const left = Math.max(page - siblings, 2);
  const right = Math.min(page + siblings, totalPages - 1);

  const showLeftEllipsis = left > 2;
  const showRightEllipsis = right < totalPages - 1;

  const items: (number | "ellipsis")[] = [1];
  if (showLeftEllipsis) items.push("ellipsis");
  for (let p = left; p <= right; p++) items.push(p);
  if (showRightEllipsis) items.push("ellipsis");
  items.push(totalPages);
  return items;
}

export function Pagination({
  page,
  totalPages,
  siblings = 1,
  onChange,
}: PaginationProps) {
  const items = paginationRange(page, totalPages, siblings);

  return (
    <nav
      aria-label="Pagination"
      className="flex justify-center items-center gap-2 mt-10"
    >
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="btn btn-ghost btn-sm"
        aria-label="Previous page"
      >
        <Icon name="arrowLeft" size={14} /> Previous
      </button>
      <ul className="flex gap-1 list-none m-0 p-0">
        {items.map((item, i) =>
          item === "ellipsis" ? (
            <li
              key={`e-${i}`}
              aria-hidden="true"
              className="px-2 text-sm self-center"
              style={{ color: "var(--muted)" }}
            >
              …
            </li>
          ) : (
            <li key={item}>
              <button
                onClick={() => onChange(item)}
                className="btn btn-sm"
                style={{
                  width: 36,
                  padding: 0,
                  background:
                    page === item ? "var(--green-700)" : "transparent",
                  color: page === item ? "#faf7f2" : "var(--ink-2)",
                  borderColor:
                    page === item ? "var(--green-700)" : "var(--line)",
                }}
                aria-current={page === item ? "page" : undefined}
                aria-label={`Page ${item}`}
              >
                {item}
              </button>
            </li>
          )
        )}
      </ul>
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="btn btn-ghost btn-sm"
        aria-label="Next page"
      >
        Next <Icon name="arrowRight" size={14} />
      </button>
    </nav>
  );
}
