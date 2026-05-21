"use client";

import { Input, FieldHelper } from "@/components/ui/input";

export function OtpField({
  value,
  onChange,
  disabled,
  error,
  id = "otp-code",
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  error?: string;
  id?: string;
}) {
  return (
    <div>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoCorrect="off"
        maxLength={6}
        value={value}
        disabled={disabled}
        aria-label="One-time passcode"
        aria-invalid={!!error}
        className="text-center text-lg font-semibold tracking-[0.35em]"
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
          onChange(digits);
        }}
      />
      {error ? <FieldHelper id={`${id}-error`}>{error}</FieldHelper> : null}
    </div>
  );
}
