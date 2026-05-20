import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { SaveJobButton } from "./SaveJobButton";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/renderWithProviders";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function renderButton(jobId = "job-1") {
  localStorage.setItem("zed_cv_token", "test-token");
  localStorage.setItem("zed_cv_user_id", "user-1");
  return renderWithProviders(<SaveJobButton jobId={jobId} />);
}

beforeEach(() => {
  server.use(
    http.get(`${API}/users/me/saved-jobs`, () =>
      HttpResponse.json({ job_ids: [] })
    ),
    http.post(`${API}/jobs/:id/save`, () =>
      HttpResponse.json({ saved: true, job_id: "job-1" }, { status: 201 })
    ),
    http.delete(`${API}/jobs/:id/save`, () => new HttpResponse(null, { status: 204 }))
  );
});

afterEach(() => {
  localStorage.clear();
  cleanup();
});

describe("SaveJobButton", () => {
  it("calls save API and shows Saved label", async () => {
    const user = userEvent.setup();
    let saved = false;
    server.use(
      http.post(`${API}/jobs/:id/save`, () => {
        saved = true;
        return HttpResponse.json({ saved: true, job_id: "job-1" }, { status: 201 });
      })
    );

    renderButton();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save job/i })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /save job/i }));

    await waitFor(() => expect(saved).toBe(true));
    expect(screen.getByRole("button", { name: /remove from saved/i })).toHaveTextContent(
      "Saved"
    );
  });

  it("calls unsave API when toggling off", async () => {
    const user = userEvent.setup();
    let unsaved = false;
    server.use(
      http.get(`${API}/users/me/saved-jobs`, () =>
        HttpResponse.json({ job_ids: ["job-1"] })
      ),
      http.delete(`${API}/jobs/:id/save`, () => {
        unsaved = true;
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderButton();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /remove from saved/i })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /remove from saved/i }));

    await waitFor(() => expect(unsaved).toBe(true));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save job/i })).toHaveTextContent("Save");
    });
  });
});
