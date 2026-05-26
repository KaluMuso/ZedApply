"use client";

import { useCallback, useRef } from "react";
import { FieldHelper } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const OTP_LEN = 6;

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
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.replace(/\D/g, "").slice(0, OTP_LEN).split("");
  while (digits.length < OTP_LEN) digits.push("");

  const setDigits = useCallback(
    (next: string[]) => {
      onChange(next.join("").replace(/\D/g, "").slice(0, OTP_LEN));
    },
    [onChange],
  );

  const focusIndex = (index: number) => {
    const el = inputsRef.current[index];
    el?.focus();
    el?.select();
  };

  const handleChange = (index: number, char: string) => {
    const d = char.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = d;
    setDigits(next);
    if (d && index < OTP_LEN - 1) {
      focusIndex(index + 1);
    }
  };

  const handleKeyDown = (index: number, key: string) => {
    if (key === "Backspace") {
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        setDigits(next);
      } else if (index > 0) {
        focusIndex(index - 1);
        const next = [...digits];
        next[index - 1] = "";
        setDigits(next);
      }
      return;
    }
    if (key === "ArrowLeft" && index > 0) {
      focusIndex(index - 1);
    }
    if (key === "ArrowRight" && index < OTP_LEN - 1) {
      focusIndex(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LEN);
    if (!pasted) return;
    const next = pasted.split("");
    while (next.length < OTP_LEN) next.push("");
    setDigits(next);
    focusIndex(Math.min(pasted.length, OTP_LEN - 1));
  };

  return (
    <div>
      <div
        className="otp-box-row flex justify-center gap-2 sm:gap-3"
        role="group"
        aria-label="One-time passcode"
        id={id}
      >
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={d}
            disabled={disabled}
            aria-label={`Digit ${i + 1} of ${OTP_LEN}`}
            data-testid={`otp-box-${i}`}
            className={cn(
              "otp-box w-11 h-14 sm:w-12 sm:h-[3.25rem] text-center text-xl sm:text-2xl font-semibold font-mono rounded-lg",
              "border transition-colors outline-none",
              error ? "border-destructive" : "border-[var(--line-2)]",
              "bg-[var(--surface)] text-[var(--ink)]",
              "focus:border-[var(--green-500)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--green-500)_25%,transparent)]",
              disabled && "opacity-50 cursor-not-allowed",
            )}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e.key)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
          />
        ))}
      </div>
      {error ? <FieldHelper id={`${id}-error`}>{error}</FieldHelper> : null}
    </div>
  );
}
