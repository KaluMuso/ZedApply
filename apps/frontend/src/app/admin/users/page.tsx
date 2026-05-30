"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth";
import { AdminTabLoader } from "../_components/AdminTabLoader";

const UsersTab = dynamic(
  () => import("../_tabs/UsersTab").then((m) => ({ default: m.UsersTab })),
  { loading: () => <AdminTabLoader /> }
);

export default function AdminUsersPage() {
  const { token } = useAuth();
  if (!token) return null;
  return <UsersTab token={token} />;
}
