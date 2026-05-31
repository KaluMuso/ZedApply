import { describe, expect, it } from "vitest";
import { EMPLOYER_NAV, employerSectionFromPath } from "../employer-nav";

describe("employerSectionFromPath", () => {
  it("resolves exact nav hrefs", () => {
    for (const item of EMPLOYER_NAV) {
      expect(employerSectionFromPath(item.href)).toBe(item.slug);
    }
  });

  it("maps candidate detail routes to search", () => {
    expect(employerSectionFromPath("/employer/candidates/abc-123")).toBe("search");
  });

  it("defaults unknown paths to dashboard", () => {
    expect(employerSectionFromPath("/employer/signup")).toBe("dashboard");
    expect(employerSectionFromPath("/employer")).toBe("dashboard");
  });

  it("exposes billing nav entry for employer subscriptions", () => {
    const billing = EMPLOYER_NAV.find((n) => n.slug === "billing");
    expect(billing?.href).toBe("/employer/billing");
    expect(billing?.description).toMatch(/lite|pro/i);
  });
});
