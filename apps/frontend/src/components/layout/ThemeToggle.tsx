"use client";

import { Moon, Sun, MonitorCog } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return (
      <span className="size-8 rounded-lg border border-transparent bg-transparent" aria-hidden />
    );
  }
  const dark = resolvedTheme === "dark";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-transparent text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Change color theme"
      >
        {dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
        <span className="sr-only">Theme menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[60] min-w-40">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <MonitorCog className="mr-2 h-4 w-4" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
