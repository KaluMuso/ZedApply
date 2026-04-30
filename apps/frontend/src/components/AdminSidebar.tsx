"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/scraper", label: "Scraper" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="rounded-xl border border-border p-2">
      <nav className="space-y-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "block rounded-md px-3 py-2 text-sm",
              pathname === l.href ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
