"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Menu, LogOut, User, Settings, Shield, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { profile as profileApi } from "@/lib/api";
import { useAppStore } from "@/lib/zustand-store";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mainNav = [
  { href: "/matches", label: "Matches" },
  { href: "/jobs", label: "Jobs" },
  { href: "/profile", label: "Profile" },
  { href: "/pricing", label: "Pricing" },
];

function NavLink({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "relative min-h-11 items-center inline-flex px-1 text-sm font-medium transition touch-target",
        active
          ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </Link>
  );
}

function initials(phone: string, name: string | null | undefined) {
  if (name && name.trim().length > 0) {
    const p = name.trim().split(/\s+/);
    if (p.length >= 2) {
      return (p[0]![0]! + p[1]![0]!).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  const d = phone.replace(/\D/g, "");
  return d.slice(-2) || "CV";
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, token, user, logout } = useAuth();
  const { profile, setProfile } = useAppStore();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!isAuthenticated || !token || !user?.id) {
      return;
    }
    if (profile?.id === user.id) {
      return;
    }
    profileApi
      .get(token)
      .then(setProfile)
      .catch(() => {});
  }, [isAuthenticated, token, user?.id, profile?.id, setProfile]);

  const showAdmin = profile?.role === "superadmin";

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-border/60 bg-white/80 backdrop-blur-sm dark:bg-background/80"
    >
      <div className="max-w-7xl mx-auto flex h-14 sm:h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href="/"
            className="flex min-h-11 min-w-0 items-center gap-2 font-bold text-lg text-foreground"
          >
            <span className="hidden h-7 w-1 rounded-sm bg-primary sm:block" aria-hidden />
            <span className="text-lg sm:text-xl">Zed CV</span>
          </Link>
        </div>

        <nav
          className="hidden flex-1 justify-center gap-6 md:flex"
          aria-label="Main"
        >
          {mainNav.map((l) => (
            <NavLink key={l.href} href={l.href} label={l.label} />
          ))}
          {showAdmin && <NavLink href="/admin" label="Admin" />}
        </nav>

        <div className="flex flex-none items-center gap-1 sm:gap-2">
          <ThemeToggle />
          {isAuthenticated && profile ? (
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Account menu"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
                      {initials(profile.phone, profile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[60] w-52" sideOffset={4}>
                  <p className="px-2 py-1.5 text-xs text-muted-foreground">Signed in as</p>
                  <p className="truncate px-2 text-sm font-medium" title={profile.phone}>
                    {profile.full_name || profile.phone}
                  </p>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/profile")}>
                    <User className="mr-2 h-4 w-4" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/settings")}>
                    <Settings className="mr-2 h-4 w-4" /> Settings
                  </DropdownMenuItem>
                  {showAdmin && (
                    <DropdownMenuItem onClick={() => router.push("/admin")}>
                      <Shield className="mr-2 h-4 w-4" /> Admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      logout();
                      setProfile(null);
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}
          {isAuthenticated && !profile && (
            <div
              className="hidden h-9 w-9 rounded-full border border-dashed border-muted-foreground/40 md:block"
              title="Loading profile"
            />
          )}
          {!isAuthenticated && (
            <Link
              href={`/auth?next=${encodeURIComponent(pathname || "/")}`}
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "hidden min-h-9 md:inline-flex items-center justify-center rounded-lg px-4"
              )}
            >
              Sign in
            </Link>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className="md:hidden min-h-11 min-w-11 items-center justify-center inline-flex rounded-lg text-foreground hover:bg-muted"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100vw,20rem)] p-0">
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" aria-hidden />
                  <SheetTitle className="text-left text-lg">Menu</SheetTitle>
                </div>
              </div>
              <nav className="flex flex-col p-2" aria-label="Mobile">
                {mainNav.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={close}
                    className={cn(
                      "min-h-11 flex items-center rounded-md px-3 text-base font-medium",
                      pathname === l.href || pathname.startsWith(l.href)
                        ? "bg-primary/10 text-primary"
                        : "text-foreground"
                    )}
                  >
                    {l.label}
                  </Link>
                ))}
                {showAdmin && (
                  <Link
                    href="/admin"
                    onClick={close}
                    className="min-h-11 flex items-center rounded-md px-3 text-base font-medium"
                  >
                    Admin
                  </Link>
                )}
                {isAuthenticated ? (
                  <>
                    <Link
                      href="/settings"
                      onClick={close}
                      className="min-h-11 flex items-center rounded-md px-3 text-base"
                    >
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => { logout(); setProfile(null); close(); }}
                      className="min-h-11 w-full text-left text-destructive px-3"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <Link
                    href={`/auth?next=${encodeURIComponent(pathname || "/")}`}
                    onClick={close}
                    className="min-h-11 flex items-center justify-center rounded-md bg-primary px-3 text-primary-foreground"
                  >
                    Sign in
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
