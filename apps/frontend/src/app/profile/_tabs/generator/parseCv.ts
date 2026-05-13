/**
 * Parses the plain-text CV returned by /cv/generate into editable sections.
 *
 * The backend system prompt asks the LLM for one-page plain text with
 * uppercase headings: SUMMARY, SKILLS, EXPERIENCE, EDUCATION, CERTIFICATIONS.
 * In practice the model is usually compliant but occasionally drifts (mixed
 * case, missing sections, extra preamble). This parser is forgiving:
 *
 *   - Lines before the first heading become the "header" block — typically
 *     the candidate's name, phone, email, location.
 *   - Anything matching a known section heading (case-insensitive, with or
 *     without a trailing colon) opens a new section.
 *   - Unknown ALL-CAPS heading-shaped lines are treated as additional
 *     sections so we don't drop content silently.
 *
 * If parsing fails badly (no recognisable headings at all), callers get a
 * single section titled "BODY" with the entire content — the templates
 * still render it, and editing remains possible.
 */

export type ParsedSection = {
  title: string;
  body: string;
};

export type ParsedHeader = {
  name: string;
  phone: string;
  email: string;
  location: string;
  raw: string;
};

export type ParsedCV = {
  header: ParsedHeader;
  sections: ParsedSection[];
};

const KNOWN_SECTIONS = [
  "SUMMARY",
  "PROFILE",
  "OBJECTIVE",
  "SKILLS",
  "TECHNICAL SKILLS",
  "CORE SKILLS",
  "EXPERIENCE",
  "WORK EXPERIENCE",
  "PROFESSIONAL EXPERIENCE",
  "EDUCATION",
  "CERTIFICATIONS",
  "CERTIFICATES",
  "PROJECTS",
  "ACHIEVEMENTS",
  "LANGUAGES",
  "REFERENCES",
];

const PHONE_RE = /(\+?260[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{4}|\+?\d[\d\s().-]{7,}\d)/;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

function isHeading(line: string): string | null {
  const trimmed = line.trim().replace(/[:：]+$/, "").trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (KNOWN_SECTIONS.includes(upper)) return upper;
  // Generic ALL CAPS heading shape: short line, mostly letters, no sentence
  // punctuation. Avoids capturing bullets like "• MANAGED 5 TEAMS".
  if (
    trimmed.length <= 40 &&
    trimmed === trimmed.toUpperCase() &&
    /^[A-Z][A-Z\s&/-]+$/.test(trimmed) &&
    !trimmed.startsWith("•") &&
    !trimmed.startsWith("-")
  ) {
    return upper;
  }
  return null;
}

function extractHeader(rawLines: string[]): ParsedHeader {
  const raw = rawLines.join("\n").trim();
  const phoneMatch = raw.match(PHONE_RE);
  const emailMatch = raw.match(EMAIL_RE);
  const phone = phoneMatch ? phoneMatch[0].trim() : "";
  const email = emailMatch ? emailMatch[0].trim() : "";

  // The first non-empty line is almost always the candidate's name.
  const firstLine = rawLines.find((l) => l.trim().length > 0)?.trim() ?? "";
  // If the first line itself contains contact info (e.g. "Name | +260… | …"),
  // strip those pieces so the name stays clean.
  let name = firstLine
    .replace(PHONE_RE, "")
    .replace(EMAIL_RE, "")
    .replace(/[|·•]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (name.length > 80) name = name.slice(0, 80);

  // Location: look for a line that mentions a Zambian city or "Zambia",
  // common defaults for the generator's Zambian context.
  const ZM_CITIES = /\b(Lusaka|Ndola|Kitwe|Livingstone|Solwezi|Chingola|Mufulira|Kabwe|Mongu|Chipata|Choma|Kasama|Mansa|Zambia)\b/i;
  let location = "";
  for (const line of rawLines) {
    const m = line.match(ZM_CITIES);
    if (m) {
      // Trim to a sensible window around the match.
      location = line.replace(PHONE_RE, "").replace(EMAIL_RE, "").replace(/[|·•]+/g, " ").replace(/\s{2,}/g, " ").trim();
      if (location.length > 80) location = m[0];
      break;
    }
  }

  return { name, phone, email, location, raw };
}

export function parseGeneratedCv(content: string): ParsedCV {
  const text = (content || "").replace(/\r\n/g, "\n").trim();
  if (!text) {
    return {
      header: { name: "", phone: "", email: "", location: "", raw: "" },
      sections: [],
    };
  }

  const lines = text.split("\n");
  let headerEnd = -1;
  // Find the first heading line to bound the header block.
  for (let i = 0; i < lines.length; i++) {
    if (isHeading(lines[i])) {
      headerEnd = i;
      break;
    }
  }

  if (headerEnd === -1) {
    // No headings at all — graceful fallback. Whole text becomes one section.
    return {
      header: extractHeader([lines[0] ?? ""]),
      sections: [{ title: "BODY", body: text }],
    };
  }

  const header = extractHeader(lines.slice(0, headerEnd));

  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;
  for (let i = headerEnd; i < lines.length; i++) {
    const headingTitle = isHeading(lines[i]);
    if (headingTitle) {
      if (current) sections.push({ ...current, body: current.body.trim() });
      current = { title: headingTitle, body: "" };
    } else if (current) {
      current.body += lines[i] + "\n";
    }
  }
  if (current) sections.push({ ...current, body: current.body.trim() });

  // Filter empty sections — the LLM sometimes emits a heading with no body
  // when the source CV doesn't have data for it. Don't show empty editor
  // blocks to the user.
  return { header, sections: sections.filter((s) => s.body.length > 0) };
}

/** Serialize an edited ParsedCV back to plain text (for the existing
 * "Copy" button and any future re-storage). Matches the LLM's expected
 * output format: blank line between sections, heading on its own line. */
export function serializeParsedCv(parsed: ParsedCV): string {
  const headerLines = [
    parsed.header.name,
    [parsed.header.phone, parsed.header.email].filter(Boolean).join(" · "),
    parsed.header.location,
  ].filter((l) => l && l.trim().length > 0);

  const headerBlock = headerLines.join("\n");
  const body = parsed.sections
    .map((s) => `${s.title}\n${s.body.trim()}`)
    .join("\n\n");

  return [headerBlock, body].filter(Boolean).join("\n\n").trim();
}

/** Split a section body into bullet lines for rendering. Lines that
 * begin with •, -, * or a digit+dot are treated as bullets; everything
 * else is rendered as a paragraph. */
export function splitBullets(body: string): { bullets: string[]; paragraphs: string[] } {
  const bullets: string[] = [];
  const paragraphs: string[] = [];
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^[•\-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      bullets.push(line.replace(/^[•\-*]\s+|^\d+[.)]\s+/, "").trim());
    } else {
      paragraphs.push(line);
    }
  }
  return { bullets, paragraphs };
}
