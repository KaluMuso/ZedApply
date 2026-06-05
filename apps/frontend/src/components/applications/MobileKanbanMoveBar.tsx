"use client";

import type { KanbanColumnId } from "@/lib/application-status";

export function MobileKanbanMoveBar({
  columns,
  onSelect,
  onCancel,
}: {
  columns: ReadonlyArray<{ id: KanbanColumnId; label: string }>;
  onSelect: (columnId: KanbanColumnId) => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-x-3 z-[60] rounded-2xl border p-3 shadow-lg md:hidden"
      style={{
        bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
        borderColor: "var(--line)",
        background: "var(--surface)",
      }}
      role="dialog"
      aria-label="Move application to stage"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          Move to stage
        </p>
        <button
          type="button"
          className="text-xs font-medium px-2 py-1 rounded-md"
          style={{ color: "var(--muted)" }}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {columns.map((column) => (
          <button
            key={column.id}
            type="button"
            className="min-h-10 rounded-full px-3 text-xs font-semibold"
            style={{
              background: "var(--bg-2)",
              color: "var(--ink)",
              border: "1px solid var(--line)",
            }}
            onClick={() => onSelect(column.id)}
          >
            {column.label}
          </button>
        ))}
      </div>
    </div>
  );
}
