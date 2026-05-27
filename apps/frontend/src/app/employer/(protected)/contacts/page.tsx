"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { employer, type ContactRequestRow } from "@/lib/api";

export default function EmployerContactsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<ContactRequestRow[]>([]);

  useEffect(() => {
    if (!token) return;
    void employer.contacts(token).then((d) => setRows(d.contacts));
  }, [token]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Phone and email appear only when the candidate consents (YES). Declined or expired requests
        hide PII.
      </p>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border p-4 text-sm">
            <div className="flex justify-between gap-2">
              <span className="font-medium capitalize">{r.status}</span>
              <span className="text-muted-foreground">{r.channel}</span>
            </div>
            <p className="mt-2 text-muted-foreground line-clamp-2">{r.message_text}</p>
            {r.status === "consented" ? (
              <p className="mt-2">
                {r.candidate_name ?? "Candidate"} — {r.candidate_phone ?? "—"} ·{" "}
                {r.candidate_email ?? "—"}
              </p>
            ) : null}
          </li>
        ))}
        {rows.length === 0 ? (
          <li className="text-sm text-muted-foreground">No contact requests yet.</li>
        ) : null}
      </ul>
    </div>
  );
}
