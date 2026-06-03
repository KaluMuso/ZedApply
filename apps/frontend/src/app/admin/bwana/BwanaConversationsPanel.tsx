"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminBwana,
  type BwanaConversationSummary,
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/toast";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export function BwanaConversationsPanel({ token }: { token: string }) {
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [items, setItems] = useState<BwanaConversationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminBwana.conversations(token, {
        q: appliedQ || undefined,
        limit: 50,
        offset: 0,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Failed to load conversations");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, appliedQ]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSearch = () => {
    setAppliedQ(q.trim());
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (appliedQ) params.set("q", appliedQ);
    const url = `${API_BASE}/admin/bwana/conversations/export?${params.toString()}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = "bwana-conversations.csv";
        link.click();
        URL.revokeObjectURL(objectUrl);
      })
      .catch((e) => {
        notify.error(e instanceof Error ? e.message : "Export failed");
      });
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Conversation history</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Transcripts from <code className="text-xs">ai_cache</code> (last ~20
            turns per session). Contains user PII — admin only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-sm space-y-1 flex-1 min-w-[200px]">
            Search
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="user id, session id, or message text"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
            />
          </label>
          <Button type="button" variant="secondary" onClick={handleSearch}>
            Search
          </Button>
          <Button type="button" variant="outline" onClick={handleExport}>
            Export CSV
          </Button>
        </div>
        {loading && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {!loading && (
          <p className="text-xs text-muted-foreground">
            {total} session{total === 1 ? "" : "s"} matched
            {appliedQ ? ` for “${appliedQ}”` : ""}
          </p>
        )}
        {!loading && items.length === 0 && (
          <p className="text-sm text-muted-foreground">No conversations found.</p>
        )}
        <ul className="space-y-2 text-sm">
          {items.map((row) => (
            <li
              key={`${row.user_id}:${row.session_id}`}
              className="rounded-lg border p-3"
            >
              <div className="font-mono text-xs text-muted-foreground break-all">
                user {row.user_id} · session {row.session_id}
              </div>
              <p className="mt-1">{row.preview || "(no preview)"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {row.message_count} messages
                {row.last_activity_at
                  ? ` · last ${row.last_activity_at}`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
