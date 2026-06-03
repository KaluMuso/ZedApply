import type { ParsedCV } from "@/app/profile/_tabs/generator/parseCv";
import { splitBullets } from "@/app/profile/_tabs/generator/parseCv";
import type { TailoredCvDraft, EducationEntry, ExperienceEntry } from "./types";
import { DEFAULT_STYLE } from "./store";
import { normalizeSkillList } from "./skillsDisplay";

const SKILL_SECTION_TITLES = new Set([
  "SKILLS",
  "TECHNICAL SKILLS",
  "CORE SKILLS",
  "KEY SKILLS",
  "RELEVANT SKILLS",
  "COMPETENCIES",
]);

const MAJOR_SECTION_TITLES = new Set([
  "SUMMARY",
  "PROFILE",
  "OBJECTIVE",
  "BODY",
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
]);

function sectionBody(parsed: ParsedCV, ...titles: string[]): string {
  const upper = new Set(titles.map((t) => t.toUpperCase()));
  const hit = parsed.sections.find((s) => upper.has(s.title.toUpperCase()));
  return hit?.body.trim() ?? "";
}

/**
 * parseGeneratedCv treats short ALL-CAPS tokens (e.g. "IFRS", "SAP") as headings.
 * When that happens under SKILLS, recover tokens from pseudo-sections before Experience.
 */
function extractSkillsBody(parsed: ParsedCV): string {
  const direct = sectionBody(parsed, ...SKILL_SECTION_TITLES);
  if (direct) return direct;

  const experienceIdx = parsed.sections.findIndex((s) =>
    ["EXPERIENCE", "WORK EXPERIENCE", "PROFESSIONAL EXPERIENCE"].includes(s.title),
  );
  if (experienceIdx <= 0) return "";

  const beforeExperience = parsed.sections.slice(0, experienceIdx);
  const skillZone = beforeExperience.filter((s) => !MAJOR_SECTION_TITLES.has(s.title));
  if (skillZone.length === 0) return "";

  const parts: string[] = [];
  for (const section of skillZone) {
    if (SKILL_SECTION_TITLES.has(section.title)) {
      if (section.body.trim()) parts.push(section.body.trim());
      continue;
    }
    parts.push(section.title);
    if (section.body.trim()) parts.push(section.body.trim());
  }
  return parts.join("\n");
}

function parseSkills(body: string): string[] {
  if (!body) return [];
  const { bullets, paragraphs } = splitBullets(body);
  if (bullets.length > 0) return normalizeSkillList(bullets);

  const commaSplit = body
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (commaSplit.length > 1) return normalizeSkillList(commaSplit);

  const lineSplit =
    paragraphs.length > 1
      ? paragraphs
      : body
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
  if (lineSplit.length > 1) return normalizeSkillList(lineSplit);

  return normalizeSkillList(commaSplit.length > 0 ? commaSplit : lineSplit);
}

function parseExperience(body: string): ExperienceEntry[] {
  if (!body) return [];
  const blocks = body.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length === 0) {
    const { bullets, paragraphs } = splitBullets(body);
    if (bullets.length === 0 && paragraphs.length === 0) return [];
    return [
      {
        title: "",
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        achievements: bullets.length > 0 ? bullets : paragraphs,
      },
    ];
  }

  return blocks.map((block) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const head = lines[0] ?? "";
    const rest = lines.slice(1).join("\n");
    const { bullets, paragraphs } = splitBullets(rest || block);
    const achievements = bullets.length > 0 ? bullets : paragraphs.length > 0 ? paragraphs : [head];
    const atParts = head.split(/\s+at\s+/i);
    const title = atParts[0]?.trim() ?? head;
    const company = atParts[1]?.trim() ?? "";
    return {
      title,
      company,
      location: "",
      startDate: "",
      endDate: "",
      achievements: achievements.filter(Boolean),
    };
  });
}

function parseEducation(body: string): EducationEntry[] {
  if (!body) return [];
  const blocks = body.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((block) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const head = lines[0] ?? "";
    return {
      degree: head,
      institution: lines[1] ?? "",
      location: "",
      startDate: "",
      endDate: "",
      gpa: "",
    };
  });
}

/** Map plain-text / markdown CV output into the structured builder draft. */
export function mapParsedCvToDraft(parsed: ParsedCV): TailoredCvDraft {
  const summary =
    sectionBody(parsed, "SUMMARY", "PROFILE", "OBJECTIVE") ||
    sectionBody(parsed, "BODY");
  const skillsBody = extractSkillsBody(parsed);
  const experience = parseExperience(
    sectionBody(
      parsed,
      "EXPERIENCE",
      "WORK EXPERIENCE",
      "PROFESSIONAL EXPERIENCE",
    ),
  );
  const education = parseEducation(sectionBody(parsed, "EDUCATION"));

  return {
    basics: {
      fullName: parsed.header.name,
      headline: "",
      email: parsed.header.email,
      phone: parsed.header.phone,
      location: parsed.header.location,
      summary,
    },
    experience,
    education,
    skills: parseSkills(skillsBody),
    style: { ...DEFAULT_STYLE },
  };
}
