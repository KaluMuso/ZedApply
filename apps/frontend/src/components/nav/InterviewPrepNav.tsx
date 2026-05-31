"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

const SUB_LINKS = [
  { href: "/interview-prep/mock", label: "Mock Interview" },
  { href: "/interview-prep/aptitude", label: "Aptitude Tests" },
  { href: "/interview-prep/history", label: "History" },
] as const;

type InterviewPrepNavProps = {
  className?: string;
  /** Mobile drawer: render as stacked links instead of dropdown */
  variant?: "dropdown" | "stacked";
  onNavigate?: () => void;
};

export function InterviewPrepNav({
  className,
  variant = "dropdown",
  onNavigate,
}: InterviewPrepNavProps) {
  const pathname = usePathname();
  const active = pathname.startsWith("/interview-prep");

  if (variant === "stacked") {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <Link
          href="/interview-prep"
          onClick={onNavigate}
          className={cn(
            "font-display text-2xl py-2 transition-colors pl-4",
            active ? "text-primary" : "text-ink-2",
          )}
        >
          Interview Prep
        </Link>
        {SUB_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "font-display text-xl py-2 transition-colors pl-8",
              pathname === link.href ? "text-primary" : "text-ink-2",
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "nav-link inline-flex items-center gap-1 bg-transparent border-0 cursor-pointer font-inherit",
          active && "active",
          className,
        )}
        aria-label="Interview prep menu"
      >
        Interview Prep
        <Icon name="chevronDown" size={14} className="opacity-70" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px]">
        <DropdownMenuItem>
          <Link href="/interview-prep" className="w-full">
            Overview
          </Link>
        </DropdownMenuItem>
        {SUB_LINKS.map((link) => (
          <DropdownMenuItem key={link.href}>
            <Link href={link.href} className="w-full">
              {link.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
