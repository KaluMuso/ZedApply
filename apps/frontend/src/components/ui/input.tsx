import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";

function Input({
  className,
  type,
  "aria-invalid": ariaInvalid,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      aria-invalid={ariaInvalid}
      className={cn(
        "field min-h-[44px] w-full min-w-0 rounded-sm border border-input bg-background px-3.5 py-2 text-base transition-colors duration-200 ease-out outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-body",
        ariaInvalid === true || ariaInvalid === "true"
          ? "field-error"
          : "",
        className
      )}
      {...props}
    />
  );
}

function FieldHelper({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <p id={id} className="field-helper" role="alert">
      {children}
    </p>
  );
}

export { Input, FieldHelper };
