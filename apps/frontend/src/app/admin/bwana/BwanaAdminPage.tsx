"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { AdminTabLoader } from "../_components/AdminTabLoader";
import { BwanaOverviewPanel } from "./BwanaOverviewPanel";
import { BwanaConversationsPanel } from "./BwanaConversationsPanel";

const BwanaConfigTab = dynamic(
  () => import("./BwanaConfigTab").then((m) => ({ default: m.BwanaConfigTab })),
  { loading: () => <AdminTabLoader /> },
);

type Tab = "overview" | "config" | "conversations";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "config", label: "Config" },
  { id: "conversations", label: "Conversations" },
];

export function BwanaAdminPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");

  if (!token) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bwana</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Chatbot operations — analytics, transcripts, and platform config.
        </p>
      </div>
      <div
        className="flex flex-wrap gap-1 border-b border-border pb-2"
        role="tablist"
        aria-label="Bwana admin sections"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              background:
                tab === t.id ? "hsl(var(--muted) / 0.5)" : "transparent",
              color:
                tab === t.id
                  ? "hsl(var(--foreground))"
                  : "hsl(var(--muted-foreground))",
            }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "overview" && <BwanaOverviewPanel token={token} />}
      {tab === "config" && <BwanaConfigTab token={token} />}
      {tab === "conversations" && <BwanaConversationsPanel token={token} />}
    </div>
  );
}
