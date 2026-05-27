"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EMPLOYER_NAV, employerSectionFromPath } from "../employer-nav";

export function EmployerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const current = employerSectionFromPath(pathname);
  const sectionMeta =
    EMPLOYER_NAV.find((n) => n.slug === current) ?? EMPLOYER_NAV[0];

  return (
    <div className="max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
          Employer
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{sectionMeta.label}</h1>
        <p className="text-sm text-muted-foreground mt-1">{sectionMeta.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)] gap-8 lg:gap-10">
        <nav
          className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 lg:sticky lg:top-24 lg:self-start"
          aria-label="Employer sections"
        >
          {EMPLOYER_NAV.map((item) => {
            const active = current === item.slug;
            return (
              <Link
                key={item.slug}
                href={item.href}
                className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors border"
                style={{
                  background: active ? "var(--bg-2, hsl(var(--muted) / 0.15))" : "transparent",
                  color: active ? "var(--ink, inherit)" : "var(--muted-foreground)",
                  borderColor: active ? "hsl(var(--border))" : "transparent",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
