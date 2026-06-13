"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth";
import { AdminTabLoader } from "../_components/AdminTabLoader";

const ScrapeTargetsTab = dynamic(
  () => import("../_tabs/ScrapeTargetsTab").then((m) => ({ default: m.ScrapeTargetsTab })),
  { loading: () => <AdminTabLoader /> }
);

export default function ScrapeTargetsPage() {
  const { token } = useAuth();
  if (!token) return null;
  return <ScrapeTargetsTab token={token} />;
}
