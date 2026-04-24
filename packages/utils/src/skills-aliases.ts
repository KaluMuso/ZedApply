/**
 * Skills normalization — shared between frontend and backend.
 */
export const SKILL_ALIASES: Record<string, string> = {
  js: "javascript", ts: "typescript", "c#": "csharp", py: "python",
  node: "nodejs", "node.js": "nodejs", "next.js": "nextjs", "react.js": "react",
  "ms word": "microsoft office", word: "microsoft office",
  "ms excel": "excel", "ms powerpoint": "powerpoint", ppt: "powerpoint",
  "google docs": "google workspace", "google sheets": "google workspace",
  hr: "human resources", pm: "project management", "data entry": "data analysis",
  bookkeeping: "accounting",
};

export function normalizeSkill(raw: string): string {
  const lower = raw.trim().toLowerCase();
  return SKILL_ALIASES[lower] ?? lower;
}

export function normalizeSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  return skills.reduce<string[]>((acc, s) => {
    const n = normalizeSkill(s);
    if (!seen.has(n)) { seen.add(n); acc.push(n); }
    return acc;
  }, []);
}

export const SKILL_CATEGORIES = {
  programming: "Programming & Development",
  tools: "Software & Tools",
  soft_skill: "Soft Skills",
  domain: "Industry & Domain",
} as const;
