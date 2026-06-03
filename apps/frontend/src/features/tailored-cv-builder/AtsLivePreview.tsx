"use client";

import { cn } from "@/lib/utils";
import type { TailoredCvDraft } from "./types";
import {
  formatSkillsLine,
  getDraftSkillsForPreview,
  PREVIEW_MAX_VISIBLE_SKILLS,
} from "./skillsDisplay";

function PreviewSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="cv-preview-section" open={defaultOpen}>
      <summary className="cv-preview-section-title">{title}</summary>
      <div className="cv-preview-section-body">{children}</div>
    </details>
  );
}

function SkillsPreviewBlock({ skills }: { skills: string[] }) {
  const { visible, overflowCount } = formatSkillsLine(skills, {
    maxVisible: PREVIEW_MAX_VISIBLE_SKILLS,
  });
  const printLine = formatSkillsLine(skills).line;

  if (visible.length === 0) return null;

  return (
    <div className="cv-skills-block">
      <p className="cv-skills-line">{printLine}</p>
      <div className="cv-skills-tags">
        {visible.map((skill) => (
          <span key={skill} className="cv-skill-tag">
            {skill}
          </span>
        ))}
        {overflowCount > 0 ? (
          <span className="cv-skill-tag cv-skill-tag--more">
            +{overflowCount} more
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function AtsLivePreview({ draft }: { draft: TailoredCvDraft }) {
  const { basics, experience, education, style } = draft;
  const skills = getDraftSkillsForPreview(draft.skills);
  const contactBits = [basics.phone, basics.email, basics.location].filter(Boolean);
  const densityClass = style.density === "compact" ? "tailored-cv-paper--compact" : "";

  return (
    <article
      className={cn("tailored-cv-paper tailored-cv-print-root", densityClass)}
      aria-label="CV preview"
    >
      <header className="cv-print-header">
        <h1>{basics.fullName.trim() || "Your Name"}</h1>
        {basics.headline.trim() ? <p className="cv-headline">{basics.headline}</p> : null}
        {contactBits.length > 0 && (
          <div className="cv-contact">{contactBits.join("  ·  ")}</div>
        )}
      </header>

      {style.showSummary && basics.summary.trim() ? (
        <PreviewSection title="Summary">
          <p>{basics.summary}</p>
        </PreviewSection>
      ) : null}

      {experience.length > 0 && (
        <PreviewSection title="Work experience">
          {experience.map((role, i) => (
            <div key={`${role.company}-${i}`} className="cv-role-block">
              <p className="cv-entry-title">
                <strong>{role.title || "Role title"}</strong>
                {role.company ? <span>, {role.company}</span> : null}
                {role.location ? <span> ({role.location})</span> : null}
                {(role.startDate || role.endDate) && (
                  <span>
                    {"  ["}
                    {[role.startDate, role.endDate].filter(Boolean).join(" – ")}
                    {"]"}
                  </span>
                )}
              </p>
              {role.achievements.filter(Boolean).length > 0 && (
                <ul>
                  {role.achievements.filter(Boolean).map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </PreviewSection>
      )}

      {education.length > 0 && (
        <PreviewSection title="Education">
          {education.map((edu, i) => (
            <p key={`${edu.institution}-${i}`} className="cv-entry-title">
              <strong>{edu.degree || "Qualification"}</strong>
              {edu.institution ? <span>, {edu.institution}</span> : null}
              {edu.location ? <span> ({edu.location})</span> : null}
              {(edu.startDate || edu.endDate) && (
                <span>
                  {"  ["}
                  {[edu.startDate, edu.endDate].filter(Boolean).join(" – ")}
                  {"]"}
                </span>
              )}
            </p>
          ))}
        </PreviewSection>
      )}

      {skills.length > 0 ? (
        <PreviewSection title="Skills">
          <SkillsPreviewBlock skills={skills} />
        </PreviewSection>
      ) : null}
    </article>
  );
}
