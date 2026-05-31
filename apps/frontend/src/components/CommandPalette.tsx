"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type CommandItem = {
  id: string;
  label: string;
  href: string;
  keywords?: string;
  section: string;
};

const PUBLIC_COMMANDS: CommandItem[] = [
  { id: "home", label: "Home", href: "/", section: "Navigate" },
  { id: "jobs", label: "Browse jobs", href: "/jobs", section: "Navigate" },
  { id: "pricing", label: "Pricing", href: "/pricing", section: "Navigate" },
  { id: "auth", label: "Sign in", href: "/auth", section: "Account" },
  { id: "employer", label: "For employers", href: "/employer", section: "Navigate" },
  { id: "security", label: "Security & trust", href: "/security", section: "Trust" },
  { id: "contact", label: "Contact", href: "/contact", section: "Trust" },
];

const AUTH_COMMANDS: CommandItem[] = [
  { id: "matches", label: "My matches", href: "/matches", section: "App" },
  { id: "dashboard", label: "Dashboard", href: "/dashboard", section: "App" },
  { id: "applications", label: "Applications", href: "/applications", section: "App" },
  { id: "profile", label: "Profile", href: "/profile", section: "App" },
  { id: "settings", label: "Settings", href: "/settings/account", section: "App" },
  { id: "cv-builder", label: "CV builder", href: "/profile/cv-builder", section: "App" },
];

export function CommandPalette() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo(() => {
    const all = isAuthenticated
      ? [...AUTH_COMMANDS, ...PUBLIC_COMMANDS]
      : PUBLIC_COMMANDS;
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.href.toLowerCase().includes(q) ||
        item.keywords?.toLowerCase().includes(q),
    );
  }, [isAuthenticated, query]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg gap-0 p-0 overflow-hidden sm:max-w-lg">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Icon name="search" size={16} className="text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages and actions…"
            className="border-0 shadow-none focus-visible:ring-0 min-h-11"
            aria-label="Command search"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, items.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              }
              if (e.key === "Enter" && items[activeIndex]) {
                e.preventDefault();
                go(items[activeIndex].href);
              }
            }}
          />
          <kbd className="hidden sm:inline text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">
            Esc
          </kbd>
        </div>
        <ul className="max-h-[min(60vh,320px)] overflow-y-auto p-2" role="listbox">
          {items.length === 0 ? (
            <li className="px-3 py-6 text-sm text-center text-muted-foreground">No results</li>
          ) : (
            items.map((item, index) => (
              <li key={item.id} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-2 text-sm flex items-center justify-between gap-2",
                    index === activeIndex && "bg-accent text-accent-foreground",
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => go(item.href)}
                >
                  <span>{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.section}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
