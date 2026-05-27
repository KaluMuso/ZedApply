"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth";
import { AdminTabLoader } from "../_components/AdminTabLoader";

const BulkFixWizard = dynamic(
  () =>
    import("../_components/BulkFixWizard").then((m) => ({ default: m.BulkFixWizard })),
  { loading: () => <AdminTabLoader /> }
);

export default function AdminBulkFixPage() {
  const { token } = useAuth();
  if (!token) return null;
  return <BulkFixWizard token={token} />;
}
