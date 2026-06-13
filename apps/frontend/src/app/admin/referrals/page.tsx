"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth";
import { AdminTabLoader } from "../_components/AdminTabLoader";

const ReferralsTab = dynamic(
  () => import("./ReferralsTab").then((m) => ({ default: m.ReferralsTab })),
  { loading: () => <AdminTabLoader /> }
);

export default function AdminReferralsPage() {
  const { token } = useAuth();
  if (!token) return null;
  return <ReferralsTab token={token} />;
}
