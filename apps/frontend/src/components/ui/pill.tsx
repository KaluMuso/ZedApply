import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const pillVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-line bg-bg-2 text-ink-2",
        green: "tag-green border-transparent",
        copper: "tag-copper border-transparent",
        orange: "tag-orange border-transparent",
        muted: "border-transparent bg-muted/15 text-muted-foreground",
      },
      size: {
        sm: "text-[11px] px-2 py-0.5",
        md: "text-xs px-2.5 py-0.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

function Pill({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof pillVariants>) {
  return (
    <span className={cn(pillVariants({ variant, size, className }))} {...props} />
  );
}

export { Pill, pillVariants };
