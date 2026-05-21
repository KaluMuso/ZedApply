"use client";

import { Input, FieldHelper } from "@/components/ui/input";

/** Single phone field with +260 prefix; stores 9 local digits only. */
export function PhoneField({
  digits,
  onDigitsChange,
  error,
  disabled,
  id = "phone",
}: {
  digits: string;
  onDigitsChange: (d: string) => void;
  error?: string;
  disabled?: boolean;
  id?: string;
}) {
  const display = digits.replace(/\D/g, "").slice(0, 9);

  return (
    <div>
      <div className="flex gap-2">
        <span
          className="field inline-flex shrink-0 items-center justify-center px-3 font-mono text-sm"
          aria-hidden
        >
          +260
        </span>
        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="9XX XXX XXX"
          value={display}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="flex-1 font-mono tracking-wide"
          onChange={(e) => onDigitsChange(e.target.value.replace(/\D/g, "").slice(0, 9))}
        />
      </div>
      {error ? <FieldHelper id={`${id}-error`}>{error}</FieldHelper> : null}
    </div>
  );
}
