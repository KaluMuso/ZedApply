import React from "react";
import { Metadata } from "next";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth";
import { AdminTabLoader } from "../_components/AdminTabLoader";

export const metadata: Metadata = {
  title: "Referrals | Admin",
};

const ReferralsTab = dynamic(
  () => import("./ReferralsTab").then((m) => ({ default: m.ReferralsTab })),
  { loading: () => <AdminTabLoader /> }
);

export default function AdminReferralsPage() {
  const { token } = useAuth();
  if (!token) return null;
  return <ReferralsTab token={token} />;
}
