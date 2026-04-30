import { AdminGuard } from "./admin-guard";
import { AdminSidebar } from "@/components/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <AdminSidebar />
        <div>{children}</div>
      </div>
    </AdminGuard>
  );
}
