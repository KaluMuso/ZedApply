"use client";

import { useEffect, useState } from "react";
import { cv as cvApi, type CVGenerationSummary } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";

/**
 * Renders the user's past CV generations. Clicking one fetches the full
 * content via /cv/generations/{id} and hands it to the parent so the user
 * can preview / re-edit / re-download without spending another LLM call.
 *
 * Refresh is controlled by `refreshKey` — bump it from the parent after a
 * new generation so the list re-fetches and the new row appears on top.
 */
export function HistoryPanel({
  token,
  refreshKey,
  onLoad,
}: {
  token: string;
  refreshKey: number;
  onLoad: (id: string) => void | Promise<void>;
}) {
  const [items, setItems] = useState<CVGenerationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    cvApi
      .listGenerations(token)
      .then((res) => {
        if (!cancelled) setItems(res.generations);
      })
      .catch((e) => {
        if (!cancelled) {
          setItems([]);
          setError(e instanceof Error ? e.message : "Could not load history");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey]);

  const handleClick = async (id: string) => {
    setLoadingId(id);
    try {
      await onLoad(id);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="card p-5">
      <div className="eyebrow mb-3">History</div>
      {items === null && (
        <div className="space-y-2">
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-10 w-full" />
        </div>
      )}
      {items !== null && items.length === 0 && !error && (
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Your past generations will appear here.
        </p>
      )}
      {error && (
        <p className="text-xs" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      {items && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id}>
              <button
                onClick={() => handleClick(it.id)}
                disabled={loadingId === it.id}
                className="w-full text-left rounded-md px-3 py-2"
                style={{
                  border: "1px solid var(--line-2)",
                  background: "var(--surface)",
                  color: "var(--ink)",
                  cursor: "pointer",
                }}
              >
                <div className="text-sm font-medium flex items-center justify-between gap-2">
                  <span className="truncate">{it.job_title || "Untitled"}</span>
                  {loadingId === it.id && <span className="spinner" style={{ width: 12, height: 12 }} />}
                </div>
                <div className="text-xs flex items-center gap-2" style={{ color: "var(--muted)" }}>
                  {it.company && <span className="truncate">{it.company}</span>}
                  {it.company && <span>·</span>}
                  <span>{formatDate(it.created_at)}</span>
                  <span>·</span>
                  <span>{it.word_count}w</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {items && items.length > 0 && (
        <p className="text-xs mt-3 flex items-center gap-1" style={{ color: "var(--muted)" }}>
          <Icon name="clock" size={11} /> Click any item to re-open in the editor.
        </p>
      )}
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diffMs = now - d.getTime();
    const day = 24 * 60 * 60 * 1000;
    if (diffMs < day) return "today";
    if (diffMs < 2 * day) return "yesterday";
    if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}d ago`;
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  } catch {
    return "—";
  }
}
