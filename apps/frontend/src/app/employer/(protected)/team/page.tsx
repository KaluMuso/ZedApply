"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { employer, type EmployerMe } from "@/lib/api";

export default function EmployerTeamPage() {
  const { token } = useAuth();
  const [me, setMe] = useState<EmployerMe | null>(null);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void employer.me(token).then(setMe);
  }, [token]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setMsg(null);
    try {
      const res = await employer.invite(token, { email, role: "recruiter" });
      setMsg(res.message);
      setEmail("");
      const updated = await employer.me(token);
      setMe(updated);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Invite failed");
    }
  }

  return (
    <div className="space-y-6">
      <ul className="text-sm space-y-2">
        {me?.seats.map((s) => (
          <li key={s.id} className="flex justify-between border-b py-2">
            <span>{s.invite_email ?? s.user_id.slice(0, 8)}</span>
            <span className="text-muted-foreground capitalize">{s.role}</span>
          </li>
        ))}
      </ul>
      <form onSubmit={invite} className="flex gap-2 max-w-md">
        <input
          type="email"
          required
          placeholder="colleague@company.co.zm"
          className="flex-1 rounded-md border px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="rounded-lg border px-4 py-2 text-sm font-medium">
          Invite
        </button>
      </form>
      {msg ? <p className="text-sm">{msg}</p> : null}
    </div>
  );
}
