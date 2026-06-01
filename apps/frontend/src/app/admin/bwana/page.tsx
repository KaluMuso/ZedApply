"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth";
import { AdminTabLoader } from "../_components/AdminTabLoader";

const BwanaConfigTab = dynamic(
  () => import("./BwanaConfigTab").then((m) => ({ default: m.BwanaConfigTab })),
  { loading: () => <AdminTabLoader /> },
);

export default function AdminBwanaPage() {
  const { token } = useAuth();
  if (!token) return null;
  return <BwanaConfigTab token={token} />;
}
