"use client";

import { BuilderStepShell } from "./BuilderStepShell";
import { useTailoredCvBuilderStore } from "./store";

export function StyleStepForm() {
  const style = useTailoredCvBuilderStore((s) => s.draft.style);
  const updateStyle = useTailoredCvBuilderStore((s) => s.updateStyle);
  const setStep = useTailoredCvBuilderStore((s) => s.setStep);

  return (
    <BuilderStepShell
      title="Extras"
      description="Fine-tune how your CV reads on the preview pane."
      onBack={() => setStep("skills")}
      backLabel="Skills"
      onNext={() => setStep("coverLetter")}
      nextLabel="Next: Cover letter"
    >
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium mb-2" style={{ color: "var(--ink-2)" }}>
          Layout density
        </legend>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name="cv-density"
            checked={style.density === "standard"}
            onChange={() => updateStyle({ density: "standard" })}
          />
          Standard spacing (recommended)
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name="cv-density"
            checked={style.density === "compact"}
            onChange={() => updateStyle({ density: "compact" })}
          />
          Compact — fits more on one page
        </label>
      </fieldset>

      <label className="flex items-start gap-2.5 text-sm cursor-pointer mt-4">
        <input
          type="checkbox"
          checked={style.showSummary}
          onChange={(e) => updateStyle({ showSummary: e.target.checked })}
          style={{ accentColor: "var(--green-700)", marginTop: 2 }}
        />
        <span style={{ color: "var(--ink-2)" }}>
          Include professional summary section when summary text is filled in.
        </span>
      </label>
    </BuilderStepShell>
  );
}
