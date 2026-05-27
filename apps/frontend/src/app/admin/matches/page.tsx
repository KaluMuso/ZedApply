"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth";
import { AdminTabLoader } from "../_components/AdminTabLoader";

const MatchesTab = dynamic(
  () => import("../_tabs/MatchesTab").then((m) => ({ default: m.MatchesTab })),
  { loading: () => <AdminTabLoader /> }
);

export default function AdminMatchesPage() {
  const { token } = useAuth();
  if (!token) return null;
  return <MatchesTab token={token} />;
}
