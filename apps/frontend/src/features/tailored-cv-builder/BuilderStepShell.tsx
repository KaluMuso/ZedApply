"use client";

import { Icon } from "@/components/ui/Icon";
import { builderCardStyle } from "./builderFormStyles";

export function BuilderStepShell({
  title,
  description,
  children,
  onBack,
  backLabel,
  onNext,
  nextLabel,
  nextType = "button",
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
  onNext?: () => void;
  nextLabel?: string;
  nextType?: "button" | "submit";
}) {
  return (
    <div className="flex flex-col h-full rounded-lg p-5 sm:p-6" style={builderCardStyle}>
      <div className="mb-5">
        <h2 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
          {title}
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          {description}
        </p>
      </div>
      <div className="flex flex-col flex-1 gap-4 min-h-0">{children}</div>
      {(onBack || onNext) && (
        <div className="pt-4 mt-2 flex justify-between gap-3 border-t" style={{ borderColor: "var(--line)" }}>
          {onBack ? (
            <button type="button" className="btn btn-ghost" onClick={onBack}>
              <Icon name="arrowLeft" size={14} />
              {backLabel ?? "Back"}
            </button>
          ) : (
            <span />
          )}
          {onNext ? (
            <button type={nextType} className="btn btn-primary" onClick={onNext}>
              {nextLabel ?? "Next"}
              <Icon name="arrowRight" size={14} />
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
