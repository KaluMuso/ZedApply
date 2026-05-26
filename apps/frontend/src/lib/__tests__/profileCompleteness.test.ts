import { describe, expect, it } from "vitest";
import {
  PROFILE_COMPLETENESS_TOTAL_WEIGHT,
  PROFILE_COMPLETENESS_WEIGHTS,
  computeProfileCompleteness,
  kalubaMinimalCompletenessPercent,
} from "../profileCompleteness";
import type { JobPreferences, UserProfile } from "@/lib/api";

const emptyPreferences = (): JobPreferences => ({
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
});

const baseProfile = (): UserProfile => ({
  id: "u1",
  phone: "+260971234567",
  full_name: "Test User",
  email: "test@example.com",
  skills: [],
  cv_uploaded: true,
  subscription_tier: "free",
  years_experience: 0,
  education: [],
  certifications: [],
});

describe("PROFILE_COMPLETENESS_WEIGHTS", () => {
  it("sums to 14 weighted fields", () => {
    expect(PROFILE_COMPLETENESS_TOTAL_WEIGHT).toBe(14);
    const sum = Object.values(PROFILE_COMPLETENESS_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(14);
  });
});

describe("computeProfileCompleteness", () => {
  it("does not report 100% for identity + CV only", () => {
    const result = computeProfileCompleteness({
      profile: baseProfile(),
      preferences: emptyPreferences(),
    });
    expect(result.percent).toBeLessThan(100);
    expect(result.percent).toBeGreaterThanOrEqual(30);
    expect(result.percent).toBeLessThanOrEqual(50);
  });

  it("weights CV heavier than a single text field", () => {
    const withoutCv = computeProfileCompleteness({
      profile: { ...baseProfile(), cv_uploaded: false },
      preferences: emptyPreferences(),
    });
    const withCv = computeProfileCompleteness({
      profile: baseProfile(),
      preferences: emptyPreferences(),
    });
    expect(withCv.earnedWeight - withoutCv.earnedWeight).toBe(
      PROFILE_COMPLETENESS_WEIGHTS.cv_uploaded,
    );
  });

  it("counts filled preferences toward the score", () => {
    const prefs = emptyPreferences();
    prefs.preferred_work_arrangement = "remote";
    prefs.acceptable_regions = ["Lusaka"];
    prefs.industries = [{ industry: "Technology", years_experience: 3 }];
    prefs.languages = [{ language: "English", proficiency: "native" }];
    prefs.salary_min = 500000;
    prefs.extras = { education_level: "Bachelor's degree", notice_period: "1 month" };
    prefs.manually_updated_at = new Date().toISOString();
    prefs.willing_to_relocate = false;

    const result = computeProfileCompleteness({
      profile: { ...baseProfile(), years_experience: 5 },
      preferences: prefs,
    });
    expect(result.percent).toBeGreaterThan(80);
  });

  it("kaluba minimal account is roughly 36% not 100%", () => {
    const percent = kalubaMinimalCompletenessPercent();
    expect(percent).toBe(36);
    expect(percent).toBeGreaterThanOrEqual(30);
    expect(percent).toBeLessThanOrEqual(45);
  });
});
