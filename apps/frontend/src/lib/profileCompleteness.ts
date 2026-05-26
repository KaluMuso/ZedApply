import type { JobPreferences, UserProfile } from "@/lib/api";

/** Weighted profile fields used for the completeness ring and checklist. */
export const PROFILE_COMPLETENESS_WEIGHTS = {
  phone: 1,
  email: 1,
  full_name: 1,
  cv_uploaded: 2,
  years_of_experience: 1,
  preferred_industries: 1,
  preferred_work_arrangements: 1,
  preferred_locations: 1,
  target_salary: 1,
  education_level: 1,
  languages: 1,
  certifications: 1,
  notice_period: 0.5,
  willing_to_relocate: 0.5,
} as const;

export type ProfileCompletenessFieldId = keyof typeof PROFILE_COMPLETENESS_WEIGHTS;

export const PROFILE_COMPLETENESS_TOTAL_WEIGHT = Object.values(
  PROFILE_COMPLETENESS_WEIGHTS,
).reduce((sum, w) => sum + w, 0);

export type ProfileCompletenessTabHint = "cv" | "preferences";

export interface ProfileCompletenessItem {
  id: ProfileCompletenessFieldId;
  label: string;
  weight: number;
  complete: boolean;
  hint: string;
  tab: ProfileCompletenessTabHint;
}

export interface ProfileCompletenessResult {
  percent: number;
  earnedWeight: number;
  totalWeight: number;
  items: ProfileCompletenessItem[];
}

export interface ProfileCompletenessInput {
  profile: UserProfile;
  preferences: JobPreferences | null;
}

function nonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasJsonArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function educationLevelComplete(profile: UserProfile, preferences: JobPreferences | null): boolean {
  const level = preferences?.extras?.education_level;
  if (nonEmptyString(level)) return true;
  if (hasJsonArray(profile.education)) return true;
  const cvEducation = profile.cv_sections?.education;
  return Array.isArray(cvEducation) && cvEducation.length > 0;
}

function certificationsComplete(profile: UserProfile): boolean {
  if (hasJsonArray(profile.certifications)) return true;
  const cvCerts = profile.cv_sections?.certifications;
  return Array.isArray(cvCerts) && cvCerts.length > 0;
}

function noticePeriodComplete(preferences: JobPreferences | null): boolean {
  const raw = preferences?.extras?.notice_period;
  return nonEmptyString(raw);
}

/** Willing to relocate is answered once work-arrangement prefs were saved. */
function willingToRelocateComplete(preferences: JobPreferences | null): boolean {
  if (!preferences) return false;
  if (preferences.willing_to_relocate) return true;
  return Boolean(preferences.manually_updated_at);
}

function languagesComplete(preferences: JobPreferences | null): boolean {
  if (!preferences?.languages?.length) return false;
  return preferences.languages.every(
    (entry) => nonEmptyString(entry.language) && nonEmptyString(entry.proficiency),
  );
}

function targetSalaryComplete(preferences: JobPreferences | null): boolean {
  if (!preferences) return false;
  return preferences.salary_min !== null || preferences.salary_max !== null;
}

export function computeProfileCompleteness(
  input: ProfileCompletenessInput,
): ProfileCompletenessResult {
  const { profile, preferences } = input;

  const checks: Omit<ProfileCompletenessItem, "weight">[] = [
    {
      id: "phone",
      label: "Phone number",
      complete: nonEmptyString(profile.phone),
      hint: "Verified at sign-up",
      tab: "cv",
    },
    {
      id: "email",
      label: "Email address",
      complete: nonEmptyString(profile.email),
      hint: "Add in Account settings",
      tab: "cv",
    },
    {
      id: "full_name",
      label: "Full name",
      complete: nonEmptyString(profile.full_name),
      hint: "Add in Account settings",
      tab: "cv",
    },
    {
      id: "cv_uploaded",
      label: "CV uploaded",
      complete: profile.cv_uploaded,
      hint: "Upload your CV in the CV & Skills tab",
      tab: "cv",
    },
    {
      id: "years_of_experience",
      label: "Years of experience",
      complete: (profile.years_experience ?? 0) > 0,
      hint: "Set in Preferences → Career background",
      tab: "preferences",
    },
    {
      id: "preferred_industries",
      label: "Preferred industries",
      complete: (preferences?.industries?.length ?? 0) > 0,
      hint: "Add industries you have worked in",
      tab: "preferences",
    },
    {
      id: "preferred_work_arrangements",
      label: "Work arrangement",
      complete: preferences?.preferred_work_arrangement != null,
      hint: "Choose remote, hybrid, on-site, or any",
      tab: "preferences",
    },
    {
      id: "preferred_locations",
      label: "Preferred locations",
      complete: (preferences?.acceptable_regions?.length ?? 0) > 0,
      hint: "Add provinces or regions you would work in",
      tab: "preferences",
    },
    {
      id: "target_salary",
      label: "Salary expectations",
      complete: targetSalaryComplete(preferences),
      hint: "Add a minimum or maximum salary range",
      tab: "preferences",
    },
    {
      id: "education_level",
      label: "Education level",
      complete: educationLevelComplete(profile, preferences),
      hint: "Select your highest qualification or upload a CV",
      tab: "preferences",
    },
    {
      id: "languages",
      label: "Languages",
      complete: languagesComplete(preferences),
      hint: "Add languages with proficiency levels",
      tab: "preferences",
    },
    {
      id: "certifications",
      label: "Certifications",
      complete: certificationsComplete(profile),
      hint: "Upload a CV with certifications or add them manually",
      tab: "cv",
    },
    {
      id: "notice_period",
      label: "Notice period",
      complete: noticePeriodComplete(preferences),
      hint: "Tell recruiters how soon you can start",
      tab: "preferences",
    },
    {
      id: "willing_to_relocate",
      label: "Relocation preference",
      complete: willingToRelocateComplete(preferences),
      hint: "Save your work arrangement preferences",
      tab: "preferences",
    },
  ];

  const items: ProfileCompletenessItem[] = checks.map((item) => ({
    ...item,
    weight: PROFILE_COMPLETENESS_WEIGHTS[item.id],
  }));

  const earnedWeight = items
    .filter((item) => item.complete)
    .reduce((sum, item) => sum + item.weight, 0);

  const percent = Math.round((earnedWeight / PROFILE_COMPLETENESS_TOTAL_WEIGHT) * 100);

  return {
    percent,
    earnedWeight,
    totalWeight: PROFILE_COMPLETENESS_TOTAL_WEIGHT,
    items,
  };
}

/** Minimal account: identity + CV only (no job preferences) — e.g. Kaluba baseline. */
export function kalubaMinimalCompletenessPercent(): number {
  const sample: ProfileCompletenessInput = {
    profile: {
      id: "sample",
      phone: "+260971234567",
      full_name: "Kaluba Prosper Musonda",
      email: "kaluba@example.com",
      skills: [],
      cv_uploaded: true,
      subscription_tier: "free",
      years_experience: 0,
      education: [],
      certifications: [],
      cv_sections: null,
    },
    preferences: {
      target_roles: [],
      target_roles_source: "user_provided",
      salary_min: null,
      salary_max: null,
      salary_currency: "ZMW",
      salary_frequency: null,
      preferred_work_arrangement: null,
      willing_to_relocate: false,
      acceptable_regions: [],
      languages: [],
      industries: [],
      extras: {},
      auto_populated_at: null,
      manually_updated_at: null,
      auto_populated_fields: [],
    },
  };
  return computeProfileCompleteness(sample).percent;
}
