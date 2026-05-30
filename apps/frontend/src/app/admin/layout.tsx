import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-metadata";
import { AdminGuard } from "./admin-guard";
import { AdminShell } from "./_components/AdminShell";

export const metadata: Metadata = pageMetadata({
  title: "Admin",
  description: "Internal admin dashboard for Zed Apply operations.",
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <AdminShell>{children}</AdminShell>
    </AdminGuard>
  );
}
