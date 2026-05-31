import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { savedJobs } from "../api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

describe("savedJobs applications funnel (MSW)", () => {
  it("loads saved jobs and application rows for the tracker", async () => {
    server.use(
      http.get(`${API}/users/me/saved-jobs`, () =>
        HttpResponse.json({
          jobs: [],
          applications: [
            {
              job: {
                id: "job-1",
                title: "Backend Engineer",
                company: "ACME",
                location: "Lusaka",
                closing_date: null,
                quality_score: 90,
                skills: ["python"],
                description: null,
              },
              application_status: "saved",
              status_updated_at: null,
              application_notes: null,
              interview_date: null,
            },
          ],
        }),
      ),
    );

    const res = await savedJobs.list("test-token");
    expect(res.applications).toHaveLength(1);
    expect(res.applications?.[0]?.job.title).toBe("Backend Engineer");
  });
});
