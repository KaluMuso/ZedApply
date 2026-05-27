"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { employer } from "@/lib/api";

export default function EmployerCandidatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [message, setMessage] = useState(
    "We would like to discuss a role that matches your experience.",
  );
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestContact() {
    if (!token || !id) return;
    setLoading(true);
    setStatus(null);
    try {
      const row = await employer.requestContact(token, id, {
        message_text: message,
        channel: "both",
      });
      setStatus(`Request sent — status: ${row.status}. Candidate will receive WhatsApp + email.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <button type="button" className="text-sm text-muted-foreground" onClick={() => router.back()}>
        ← Back to search
      </button>
      <p className="text-sm text-muted-foreground">
        Anonymized preview. Contact details appear in your log only after the candidate replies YES
        on WhatsApp or email.
      </p>
      <label className="block text-sm font-medium">
        Message to candidate
        <textarea
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm min-h-[120px]"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>
      <button
        type="button"
        onClick={() => void requestContact()}
        disabled={loading}
        className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
      >
        {loading ? "Sending…" : "Request contact"}
      </button>
      {status ? <p className="text-sm">{status}</p> : null}
    </div>
  );
}
