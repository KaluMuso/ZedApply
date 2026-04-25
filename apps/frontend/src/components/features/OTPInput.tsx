"use client";

import { useRef, type KeyboardEvent, type ClipboardEvent } from "react";
import { cn } from "@/lib/utils";

const len = 6;

interface OTPInputProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  "aria-label"?: string;
}

export function OTPInput({ value, onChange, disabled, "aria-label": ariaLabel = "One-time passcode" }: OTPInputProps) {
  const ref = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.replace(/\D/g, "").slice(0, len).split("");
  while (digits.length < len) {
    digits.push("");
  }

  const setAt = (i: number, d: string) => {
    const cur = value.replace(/\D/g, "");
    const next = (cur.slice(0, i) + d + cur.slice(i + 1)).slice(0, len);
    onChange(next);
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      setAt(i - 1, "");
      ref.current[i - 1]?.focus();
    }
  };

  const onPaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, len);
    onChange(t);
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2" onPaste={onPaste}>
      {digits.map((ch, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          autoCorrect="off"
          className={cn(
            "h-12 w-10 sm:w-12 rounded-lg border border-input bg-background text-center text-lg font-semibold",
            "text-foreground shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
          value={ch}
          disabled={disabled}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "").slice(-1);
            setAt(i, d);
            if (d && i < len - 1) {
              ref.current[i + 1]?.focus();
            }
          }}
          onKeyDown={(e) => onKeyDown(i, e)}
          ref={(r) => {
            ref.current[i] = r;
          }}
          aria-label={`${ariaLabel} digit ${i + 1} of ${len}`}
        />
      ))}
    </div>
  );
}
