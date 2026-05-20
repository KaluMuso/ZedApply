import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SaveJobButton } from "../SaveJobButton";
import * as api from "@/lib/api";

describe("SaveJobButton", () => {
  beforeEach(() => {
    vi.spyOn(api, "savedJobs", "get").mockReturnValue({
      save: vi.fn().mockResolvedValue({ saved: true }),
      unsave: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue({ jobs: [] }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it("calls save API when toggling from unsaved", async () => {
    const save = vi.fn().mockResolvedValue({ saved: true });
    vi.spyOn(api, "savedJobs", "get").mockReturnValue({
      save,
      unsave: vi.fn(),
      list: vi.fn(),
    });

    const onChange = vi.fn();
    render(
      <SaveJobButton jobId="j-1" saved={false} token="tok" onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /save job/i }));
    await waitFor(() => expect(save).toHaveBeenCalledWith("tok", "j-1"));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith("j-1", true));
  });

  it("calls unsave API when toggling from saved", async () => {
    const unsave = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(api, "savedJobs", "get").mockReturnValue({
      save: vi.fn(),
      unsave,
      list: vi.fn(),
    });

    render(<SaveJobButton jobId="j-2" saved token="tok" />);
    fireEvent.click(screen.getByRole("button", { name: /saved job/i }));
    await waitFor(() => expect(unsave).toHaveBeenCalledWith("tok", "j-2"));
  });
});
