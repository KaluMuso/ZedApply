"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth";
import { AdminTabLoader } from "../_components/AdminTabLoader";

const SubscriptionsTab = dynamic(
  () =>
    import("../_tabs/SubscriptionsTab").then((m) => ({ default: m.SubscriptionsTab })),
  { loading: () => <AdminTabLoader /> }
);

export default function AdminSubscriptionsPage() {
  const { token } = useAuth();
  if (!token) return null;
  return <SubscriptionsTab token={token} />;
}
