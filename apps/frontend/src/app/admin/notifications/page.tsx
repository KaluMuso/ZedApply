"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth";
import { AdminTabLoader } from "../_components/AdminTabLoader";

const NotificationsTab = dynamic(
  () =>
    import("./NotificationsTab").then((m) => ({ default: m.NotificationsTab })),
  { loading: () => <AdminTabLoader /> }
);

export default function AdminNotificationsPage() {
  const { token } = useAuth();
  if (!token) return null;
  return <NotificationsTab token={token} />;
}
