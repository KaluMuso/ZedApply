"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth";
import { AdminTabLoader } from "../_components/AdminTabLoader";

const TierConfigTab = dynamic(
  () => import("../_tabs/TierConfigTab").then((m) => ({ default: m.TierConfigTab })),
  { loading: () => <AdminTabLoader /> }
);

export default function AdminTierConfigPage() {
  const { token } = useAuth();
  if (!token) return null;
  return <TierConfigTab token={token} />;
}
