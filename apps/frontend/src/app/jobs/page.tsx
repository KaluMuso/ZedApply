"use client";

import { useEffect, useState, useCallback } from "react";
import { jobs as jobsApi, type Job } from "@/lib/api";
import { JobCard } from "@/components/JobCard";

const ZAMBIAN_LOCATIONS = [
  "All Locations",
  "Lusaka",
  "Kitwe",
  "Ndola",
  "Livingstone",
  "Kabwe",
  "Chipata",
  "Solwezi",
  "Kasama",
  "Remote",
];

export default function JobsPage() {
  const [jobsList, setJobsList] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jobsApi.list({
        page,
        search: search || undefined,
        location: location || undefined,
      });
      setJobsList(res.jobs);
      setTotalPages(res.pages);
    } catch {
      setJobsList([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, location]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchJobs();
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-6">Browse Jobs</h1>

      {/* Filters */}
      <form
        onSubmit={handleSearch}
        className="flex flex-col sm:flex-row gap-3 mb-6"
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search jobs, skills, companies..."
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
        <select
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
            setPage(1);
          }}
          className="px-4 py-3 border border-gray-300 rounded-lg text-base bg-white focus:ring-2 focus:ring-brand-500"
        >
          {ZAMBIAN_LOCATIONS.map((loc) => (
            <option key={loc} value={loc === "All Locations" ? "" : loc}>
              {loc}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-brand-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-700 transition touch-target sm:w-auto"
        >
          Search
        </button>
      </form>

      {/* Results */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading jobs...</div>
      ) : jobsList.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <p className="text-gray-600">No jobs found. Try a different search.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {jobsList.map((job) => (
              <JobCard
                key={job.id}
                title={job.title}
                company={job.company}
                location={job.location}
                qualityScore={job.quality_score}
                skills={job.skills}
                closingDate={job.closing_date}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition touch-target"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition touch-target"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
