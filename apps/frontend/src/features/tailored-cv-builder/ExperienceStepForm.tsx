"use client";

import { Icon } from "@/components/ui/Icon";
import { BuilderStepShell } from "./BuilderStepShell";
import {
  builderFieldStyle,
  builderInputClass,
  builderLabelClass,
} from "./builderFormStyles";
import { useTailoredCvBuilderStore } from "./store";

function achievementsToText(items: string[]): string {
  return items.filter(Boolean).join("\n");
}

function textToAchievements(text: string): string[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.length > 0 ? lines : [""];
}

export function ExperienceStepForm() {
  const experience = useTailoredCvBuilderStore((s) => s.draft.experience);
  const updateExperience = useTailoredCvBuilderStore((s) => s.updateExperience);
  const addExperience = useTailoredCvBuilderStore((s) => s.addExperience);
  const removeExperience = useTailoredCvBuilderStore((s) => s.removeExperience);
  const setStep = useTailoredCvBuilderStore((s) => s.setStep);

  return (
    <BuilderStepShell
      title="Work experience"
      description="List roles most relevant to the job you're targeting. Bullet points appear in the preview."
      onBack={() => setStep("basics")}
      backLabel="Basics"
      onNext={() => setStep("education")}
      nextLabel="Next: Education"
    >
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 -mr-1 max-h-[min(60vh,520px)]">
        {experience.map((role, index) => (
          <div
            key={index}
            className="rounded-lg p-4 space-y-3"
            style={{ border: "1px solid var(--line)", background: "var(--bg-2)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Role {index + 1}
              </span>
              {experience.length > 1 ? (
                <button
                  type="button"
                  className="text-xs hover:underline"
                  style={{ color: "var(--danger)" }}
                  onClick={() => removeExperience(index)}
                >
                  Remove
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={builderLabelClass} style={{ color: "var(--ink-2)" }}>
                  Job title
                </label>
                <input
                  value={role.title}
                  onChange={(e) => updateExperience(index, { title: e.target.value })}
                  className={builderInputClass}
                  style={builderFieldStyle}
                  placeholder="e.g. Senior Accountant"
                />
              </div>
              <div>
                <label className={builderLabelClass} style={{ color: "var(--ink-2)" }}>
                  Company
                </label>
                <input
                  value={role.company}
                  onChange={(e) => updateExperience(index, { company: e.target.value })}
                  className={builderInputClass}
                  style={builderFieldStyle}
                />
              </div>
              <div>
                <label className={builderLabelClass} style={{ color: "var(--ink-2)" }}>
                  Location
                </label>
                <input
                  value={role.location}
                  onChange={(e) => updateExperience(index, { location: e.target.value })}
                  className={builderInputClass}
                  style={builderFieldStyle}
                />
              </div>
              <div>
                <label className={builderLabelClass} style={{ color: "var(--ink-2)" }}>
                  Start
                </label>
                <input
                  value={role.startDate}
                  onChange={(e) => updateExperience(index, { startDate: e.target.value })}
                  className={builderInputClass}
                  style={builderFieldStyle}
                  placeholder="Jan 2019"
                />
              </div>
              <div>
                <label className={builderLabelClass} style={{ color: "var(--ink-2)" }}>
                  End
                </label>
                <input
                  value={role.endDate}
                  onChange={(e) => updateExperience(index, { endDate: e.target.value })}
                  className={builderInputClass}
                  style={builderFieldStyle}
                  placeholder="Present"
                />
              </div>
            </div>
            <div>
              <label className={builderLabelClass} style={{ color: "var(--ink-2)" }}>
                Achievements (one per line)
              </label>
              <textarea
                value={achievementsToText(role.achievements)}
                onChange={(e) =>
                  updateExperience(index, {
                    achievements: textToAchievements(e.target.value),
                  })
                }
                rows={4}
                className="w-full p-3 rounded-md text-sm resize-y"
                style={{ ...builderFieldStyle, lineHeight: 1.55 }}
              />
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-ghost btn-sm w-fit" onClick={addExperience}>
        <Icon name="plus" size={14} /> Add another role
      </button>
    </BuilderStepShell>
  );
}
