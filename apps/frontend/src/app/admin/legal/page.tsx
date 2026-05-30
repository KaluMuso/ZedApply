"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth";
import { AdminTabLoader } from "../_components/AdminTabLoader";

const LegalTab = dynamic(
  () => import("../_tabs/LegalTab").then((m) => ({ default: m.LegalTab })),
  { loading: () => <AdminTabLoader /> }
);

export default function AdminLegalPage() {
  const { token } = useAuth();
  if (!token) return null;
  return <LegalTab token={token} />;
}
