import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Map } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 text-center" role="region">
      <div className="h-20 w-20 text-primary/30 mb-4" aria-hidden>
        <Map className="h-full w-full" strokeWidth={0.5} />
      </div>
      <h1 className="text-2xl font-bold">This page wandered off the map</h1>
      <p className="text-muted-foreground text-sm max-w-sm mt-2">We could not find a route. Try the home page or the jobs list.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link className={cn(buttonVariants(), "min-h-11")} href="/">Back home</Link>
        <Link
          className={cn(
            buttonVariants({ variant: "outline" }),
            "min-h-11"
          )}
          href="/jobs"
        >Browse jobs</Link>
      </div>
    </div>
  );
}
