import { describe, expect, it } from "vitest";
import {
  CLOSED_OUTCOME_LABELS,
  KANBAN_COLUMNS,
  columnForStatus,
  statusForColumnDrop,
  type ApplicationStatus,
} from "../application-status";

describe("application-status kanban helpers", () => {
  it("maps each open status to its column", () => {
    const open: ApplicationStatus[] = ["saved", "applied", "interviewing", "offered"];
    for (const status of open) {
      expect(columnForStatus(status)).toBe(status);
    }
  });

  it("maps closed outcomes to the closed column", () => {
    expect(columnForStatus("closed_won")).toBe("closed");
    expect(columnForStatus("closed_lost")).toBe("closed");
  });

  it("preserves closed_lost when dropping on closed", () => {
    expect(statusForColumnDrop("closed", "closed_lost")).toBe("closed_lost");
    expect(statusForColumnDrop("closed", "applied")).toBe("closed_won");
  });

  it("maps non-closed column drops to column status", () => {
    expect(statusForColumnDrop("interviewing", "applied")).toBe("interviewing");
  });

  it("defines five kanban columns covering all statuses", () => {
    expect(KANBAN_COLUMNS).toHaveLength(5);
    const allStatuses = KANBAN_COLUMNS.flatMap((c) => c.statuses);
    const expected: ApplicationStatus[] = [
      "saved",
      "applied",
      "interviewing",
      "offered",
      "closed_won",
      "closed_lost",
    ];
    expect(allStatuses.sort()).toEqual([...expected].sort());
  });

  it("exposes human labels for closed outcomes", () => {
    expect(CLOSED_OUTCOME_LABELS.closed_won).toMatch(/offer/i);
    expect(CLOSED_OUTCOME_LABELS.closed_lost).toMatch(/proceed/i);
  });
});
