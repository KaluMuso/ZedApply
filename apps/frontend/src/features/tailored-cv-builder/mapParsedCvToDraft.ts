import type { ParsedCV } from "@/app/profile/_tabs/generator/parseCv";
import { splitBullets } from "@/app/profile/_tabs/generator/parseCv";
import type { TailoredCvDraft, EducationEntry, ExperienceEntry } from "./types";
import { DEFAULT_STYLE } from "./store";

function sectionBody(parsed: ParsedCV, ...titles: string[]): string {
  const upper = new Set(titles.map((t) => t.toUpperCase()));
  const hit = parsed.sections.find((s) => upper.has(s.title.toUpperCase()));
  return hit?.body.trim() ?? "";
}

function parseSkills(body: string): string[] {
  if (!body) return [];
  const { bullets } = splitBullets(body);
  if (bullets.length > 0) return bullets;
  return body
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
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
  const skillsBody = sectionBody(
    parsed,
    "SKILLS",
    "TECHNICAL SKILLS",
    "CORE SKILLS",
  );
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
