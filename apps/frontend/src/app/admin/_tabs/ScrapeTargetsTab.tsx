"use client";

import { useEffect, useState } from "react";
import { admin } from "@/lib/api";
import { notify } from "@/lib/toast";

export function ScrapeTargetsTab({ token }: { token: string }) {
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [url, setUrl] = useState("");
  const [interval, setIntervalHours] = useState(72);
  const [adding, setAdding] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [forcingId, setForcingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await admin.scrapeTargets.list(token);
      setTargets(data || []);
    } catch (error: any) {
      notify.error(error.message || "Failed to load targets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !url.trim()) return;
    setAdding(true);
    try {
      await admin.scrapeTargets.add({
        company_name: companyName.trim(),
        url: url.trim(),
        cron_interval_hours: interval,
      }, token);
      notify.success("Target added");
      setCompanyName("");
      setUrl("");
      setIntervalHours(72);
      load();
    } catch (error: any) {
      notify.error(error.message || "Failed to add target");
    } finally {
      setAdding(false);
    }
  };

  const onToggle = async (id: string, currentStatus: boolean) => {
    try {
      await admin.scrapeTargets.toggle(id, !currentStatus, token);
      load();
    } catch (error: any) {
      notify.error(error.message || "Failed to toggle status");
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("Delete this target?")) return;
    try {
      await admin.scrapeTargets.delete(id, token);
      notify.success("Target deleted");
      load();
    } catch (error: any) {
      notify.error(error.message || "Failed to delete target");
    }
  };

  const onTriggerAll = async () => {
    setTriggering(true);
    try {
      const res = await admin.scrapeTargets.trigger(token);
      notify.success(`Processed ${res.processed} targets`);
      load();
    } catch (e: any) {
      notify.error(e.message || "Failed to trigger");
    } finally {
      setTriggering(false);
    }
  };

  const onForceTarget = async (id: string) => {
    setForcingId(id);
    try {
      const res = await admin.scrapeTargets.force(id, token);
      notify.success(`Found ${res.jobs_found} jobs, inserted ${res.new_inserted}`);
      load();
    } catch (e: any) {
      notify.error(e.message || "Failed to force scrape");
    } finally {
      setForcingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold tracking-tight">Scrape Targets</h2>
        <button
          onClick={onTriggerAll}
          disabled={triggering}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {triggering ? "Triggering..." : "Trigger Due Targets"}
        </button>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          <form onSubmit={onAdd} className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium">Company Name</label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Bank of Zambia"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium">Careers URL</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="w-32 space-y-1">
              <label className="text-sm font-medium">Interval (hrs)</label>
              <input
                type="number"
                value={interval}
                onChange={(e) => setIntervalHours(Number(e.target.value))}
                min="1"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="h-9 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Add Target
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="p-3 font-medium">Company</th>
              <th className="p-3 font-medium">URL</th>
              <th className="p-3 font-medium">Interval</th>
              <th className="p-3 font-medium">Last Scraped</th>
              <th className="p-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && targets.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : targets.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-muted-foreground">
                  No targets configured.
                </td>
              </tr>
            ) : (
              targets.map((t) => (
                <tr key={t.id} className={!t.is_active ? "opacity-50 bg-muted/20" : ""}>
                  <td className="p-3 font-medium">{t.company_name}</td>
                  <td className="p-3">
                    <a href={t.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                      {t.url}
                    </a>
                  </td>
                  <td className="p-3">{t.cron_interval_hours}h</td>
                  <td className="p-3 text-muted-foreground">
                    {t.last_scraped_at ? new Date(t.last_scraped_at).toLocaleString() : "Never"}
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => onForceTarget(t.id)}
                      disabled={forcingId === t.id}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {forcingId === t.id ? (
                        <span className="flex items-center gap-1">
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Scraping...
                        </span>
                      ) : "Force Scrape"}
                    </button>
                    <button
                      onClick={() => onToggle(t.id, t.is_active)}
                      className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      {t.is_active ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => onDelete(t.id)}
                      className="text-xs font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
