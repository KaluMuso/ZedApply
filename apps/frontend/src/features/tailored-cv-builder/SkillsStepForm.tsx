"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { BuilderStepShell } from "./BuilderStepShell";
import { builderFieldStyle, builderInputClass, builderLabelClass } from "./builderFormStyles";
import { useTailoredCvBuilderStore } from "./store";

export function SkillsStepForm() {
  const skills = useTailoredCvBuilderStore((s) => s.draft.skills);
  const setSkills = useTailoredCvBuilderStore((s) => s.setSkills);
  const setStep = useTailoredCvBuilderStore((s) => s.setStep);
  const [draftSkill, setDraftSkill] = useState("");

  const addSkill = () => {
    const next = draftSkill.trim();
    if (!next) return;
    const key = next.toLowerCase();
    if (skills.some((s) => s.toLowerCase() === key)) {
      setDraftSkill("");
      return;
    }
    setSkills([...skills, next]);
    setDraftSkill("");
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  return (
    <BuilderStepShell
      title="Skills"
      description="Highlight capabilities that match the role. These appear as a skills line on your CV."
      onBack={() => setStep("education")}
      backLabel="Education"
      onNext={() => setStep("style")}
      nextLabel="Next: Extras"
    >
      <div className="flex gap-2">
        <input
          value={draftSkill}
          onChange={(e) => setDraftSkill(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSkill();
            }
          }}
          className={builderInputClass}
          style={builderFieldStyle}
          placeholder="e.g. IFRS, Excel, SAP"
          aria-label="Add skill"
        />
        <button type="button" className="btn btn-primary shrink-0" onClick={addSkill}>
          Add
        </button>
      </div>

      {skills.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span key={skill} className="tag tag-green inline-flex items-center gap-1">
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                className="opacity-70 hover:opacity-100"
                aria-label={`Remove ${skill}`}
              >
                <Icon name="x" size={10} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No skills yet — add at least three that match the job description.
        </p>
      )}

      <div>
        <label className={builderLabelClass} style={{ color: "var(--ink-2)" }}>
          Or paste a comma-separated list
        </label>
        <textarea
          rows={3}
          className="w-full p-3 rounded-md text-sm resize-y"
          style={{ ...builderFieldStyle, lineHeight: 1.55 }}
          placeholder="IFRS, Financial reporting, Excel"
          onBlur={(e) => {
            const parsed = e.target.value
              .split(/[,;\n]/)
              .map((s) => s.trim())
              .filter(Boolean);
            if (parsed.length > 0) {
              const merged = [...skills];
              for (const s of parsed) {
                if (!merged.some((m) => m.toLowerCase() === s.toLowerCase())) {
                  merged.push(s);
                }
              }
              setSkills(merged);
              e.target.value = "";
            }
          }}
        />
      </div>
    </BuilderStepShell>
  );
}
