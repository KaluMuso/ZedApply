"use client";

import type { ParsedCV } from "../parseCv";
import { splitBullets } from "../parseCv";

/**
 * Single-column, no-decoration layout optimised for ATS parsing.
 *
 * Why simple beats pretty here: most Zambian recruiters (and global ones
 * using Greenhouse / Workable / SmartRecruiters) ingest CVs through resume
 * parsers that get confused by columns, icons, and decorative graphics.
 * Black text on white, real headings, real bullets, no clever positioning.
 */
export function AtsTemplate({ parsed }: { parsed: ParsedCV }) {
  const { header, sections } = parsed;
  const contactBits = [header.phone, header.email, header.location].filter(Boolean);

  return (
    <div className="cv-print-root cv-ats">
      <h1>{header.name || "Your Name"}</h1>
      {contactBits.length > 0 && <div className="cv-contact">{contactBits.join("  ·  ")}</div>}
      {sections.map((s) => (
        <Section key={s.title} title={s.title} body={s.body} />
      ))}
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  const { bullets, paragraphs } = splitBullets(body);
  return (
    <section>
      <h2>{title}</h2>
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
    </section>
  );
}
