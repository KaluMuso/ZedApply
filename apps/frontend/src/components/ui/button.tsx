import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center gap-2 rounded-sm border border-transparent font-medium whitespace-nowrap transition-all duration-200 ease-out outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:brightness-95 active:brightness-90",
        primary:
          "bg-primary text-primary-foreground hover:brightness-95 active:brightness-90",
        secondary:
          "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline:
          "border-border bg-background text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        destructive:
          "bg-destructive text-destructive-foreground hover:brightness-95",
        accent:
          "bg-accent text-accent-foreground hover:brightness-95 active:brightness-90",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-[44px] h-10 px-4 text-body sm:min-h-0",
        sm: "min-h-[44px] h-8 px-3 text-sm sm:min-h-0",
        lg: "min-h-[44px] h-12 px-6 text-body-lg sm:min-h-0",
        icon: "size-11 min-h-[44px] min-w-[44px] sm:size-10 sm:min-h-0 sm:min-w-0",
        "icon-sm": "size-11 min-h-[44px] min-w-[44px] sm:size-8 sm:min-h-0 sm:min-w-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
  };

function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <ButtonPrimitive
      data-slot="button"
      disabled={isDisabled}
      className={cn(
        buttonVariants({
          variant: variant === "primary" ? "default" : variant,
          size,
          className,
        }),
        loading && "text-transparent"
      )}
      {...props}
    >
      {loading ? (
        <Loader2
          className="absolute size-4 animate-spin text-primary-foreground"
          aria-hidden
        />
      ) : null}
      {children}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
