"use client";

import { Input, FieldHelper } from "@/components/ui/input";

function formatPhoneDigits(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 9);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
}

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
  const raw = digits.replace(/\D/g, "").slice(0, 9);
  const display = formatPhoneDigits(raw);

  return (
    <div>
      <div className="phone-input-row flex gap-2">
        <span
          className="phone-input-prefix inline-flex shrink-0 items-center justify-center font-mono font-semibold"
          aria-hidden
        >
          +260
        </span>
        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="97 234 1208"
          value={display}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="phone-input-digit flex-1 font-mono font-semibold tracking-wide"
          onChange={(e) => onDigitsChange(e.target.value.replace(/\D/g, "").slice(0, 9))}
        />
      </div>
      {error ? <FieldHelper id={`${id}-error`}>{error}</FieldHelper> : null}
    </div>
  );
}
