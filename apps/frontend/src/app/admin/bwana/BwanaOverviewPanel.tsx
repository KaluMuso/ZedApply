"use client";

import { BwanaAnalyticsPanel } from "./BwanaAnalyticsPanel";
import { Card, CardContent } from "@/components/ui/card";

const CAPABILITIES = [
  "Contact, templates, custom FAQ JSON, public knowledge (config tab)",
  "System prompt preview + read-only version tag",
  "Analytics: messages, sessions, FAQ/LLM/escalation, LLM cost (llm_usage_log)",
  "Conversation search + CSV export (ai_cache transcripts)",
  "WhatsApp escalation smoke test",
];

const GAPS = [
  "n8n webhook → in-process fallback count (not logged yet)",
  "Escalation inbox UI (SQL only today)",
  "Versioned prompt history / rollback",
  "Per-session transcript drawer in admin UI",
];

export function BwanaOverviewPanel({ token }: { token: string }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 space-y-3 text-sm">
          <h2 className="text-lg font-semibold">Capabilities</h2>
          <p className="text-muted-foreground">
            Bwana is ZedApply&apos;s in-widget chatbot (FAQ → escalation → OpenRouter).
            This admin area is restricted to admin/superadmin accounts.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            {CAPABILITIES.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <h3 className="font-medium pt-2">Not built yet</h3>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            {GAPS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground pt-1">
            Operator runbook:{" "}
            <code className="text-[11px]">docs/BWANA_ADMIN.md</code>
          </p>
        </CardContent>
      </Card>
      <BwanaAnalyticsPanel token={token} />
    </div>
  );
};
