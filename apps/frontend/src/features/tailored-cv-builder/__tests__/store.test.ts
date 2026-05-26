import { describe, it, expect, beforeEach } from "vitest";
import { useTailoredCvBuilderStore, DEFAULT_DRAFT } from "../store";

describe("useTailoredCvBuilderStore", () => {
  beforeEach(() => {
    useTailoredCvBuilderStore.getState().resetDraft();
  });

  it("updates basics fields for live preview sync", () => {
    useTailoredCvBuilderStore.getState().updateBasics({ fullName: "Test User" });
    expect(useTailoredCvBuilderStore.getState().draft.basics.fullName).toBe("Test User");
    expect(useTailoredCvBuilderStore.getState().draft.experience).toEqual(DEFAULT_DRAFT.experience);
  });

  it("advances wizard step", () => {
    useTailoredCvBuilderStore.getState().setStep("experience");
    expect(useTailoredCvBuilderStore.getState().step).toBe("experience");
  });

  it("updates skills and style options", () => {
    useTailoredCvBuilderStore.getState().setSkills(["Excel", "IFRS"]);
    useTailoredCvBuilderStore.getState().updateStyle({ density: "compact" });
    const { draft } = useTailoredCvBuilderStore.getState();
    expect(draft.skills).toEqual(["Excel", "IFRS"]);
    expect(draft.style.density).toBe("compact");
  });

  it("adds and removes experience entries", () => {
    const before = useTailoredCvBuilderStore.getState().draft.experience.length;
    useTailoredCvBuilderStore.getState().addExperience();
    expect(useTailoredCvBuilderStore.getState().draft.experience).toHaveLength(before + 1);
    useTailoredCvBuilderStore.getState().removeExperience(before);
    expect(useTailoredCvBuilderStore.getState().draft.experience).toHaveLength(before);
  });
});
