"use client";

import type { ParsedCV, ParsedSection } from "../parseCv";
import { splitBullets } from "../parseCv";

/**
 * Two-column layout: copper sidebar holds identity + scannable sections
 * (skills, education, certifications), main column carries the narrative
 * (summary, experience). Less ATS-friendly than the plain template — meant
 * for human reviewers, recruiter portfolios, and printed copies.
 *
 * Section routing is hard-coded by heading name so the layout stays
 * predictable even if the LLM reorders sections in its response.
 */

const SIDEBAR_SECTIONS = new Set([
  "SKILLS",
  "TECHNICAL SKILLS",
  "CORE SKILLS",
  "EDUCATION",
  "CERTIFICATIONS",
  "CERTIFICATES",
  "LANGUAGES",
  "REFERENCES",
]);

export function DesignerTemplate({ parsed }: { parsed: ParsedCV }) {
  const { header, sections } = parsed;

  const sidebar = sections.filter((s) => SIDEBAR_SECTIONS.has(s.title));
  const main = sections.filter((s) => !SIDEBAR_SECTIONS.has(s.title));

  return (
    <div className="cv-print-root cv-designer">
      <aside className="cv-sidebar">
        <h1>{header.name || "Your Name"}</h1>
        <div className="cv-contact">
          {header.phone && <div>{header.phone}</div>}
          {header.email && <div style={{ wordBreak: "break-all" }}>{header.email}</div>}
          {header.location && <div>{header.location}</div>}
        </div>
        {sidebar.map((s) => (
          <Section key={s.title} section={s} variant="sidebar" />
        ))}
      </aside>
      <main className="cv-main">
        {main.map((s) => (
          <Section key={s.title} section={s} variant="main" />
        ))}
      </main>
    </div>
  );
}

function Section({ section, variant }: { section: ParsedSection; variant: "sidebar" | "main" }) {
  const { bullets, paragraphs } = splitBullets(section.body);
  // SKILLS in the sidebar reads better as comma-separated tags than as a
  // bullet list — and SKILLS bodies often arrive as a single comma line
  // anyway. Detect this and flatten.
  const isSkillsTags =
    variant === "sidebar" &&
    section.title.includes("SKILLS") &&
    paragraphs.length === 1 &&
    bullets.length === 0 &&
    paragraphs[0].includes(",");

  return (
    <section>
      <h2>{section.title}</h2>
      {isSkillsTags ? (
        <p>{paragraphs[0]}</p>
      ) : (
        <>
          {paragraphs.map((p, i) => (
            <p key={`p-${i}`}>{p}</p>
          ))}
          {bullets.length > 0 && (
            <ul>
              {bullets.map((b, i) => (
                <li key={`b-${i}`}>{b}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
