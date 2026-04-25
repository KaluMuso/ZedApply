"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }, [error]);

  return (
    <div className="max-w-md mx-auto py-16 text-center">
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground mt-2">We are sorry. You can try again, or return home.</p>
      <p className="text-xs text-muted-foreground/80 mt-1 break-words" role="status">
        {error.digest && `Ref: ${error.digest}`}
      </p>
      <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
        <Button className="min-h-10" onClick={reset} type="button">Try again</Button>
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium"
          href="/"
        >
          Home
        </Link>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        <a
          className="underline"
          href="mailto:convergeozambia@gmail.com?subject=Zed%20CV%20error%20report"
        >
          Report this issue
        </a>
      </p>
    </div>
  );
}
