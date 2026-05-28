import { describe, expect, it } from "vitest";
import { formatPhoneDisplay, isValidZambianPhone, toE164 } from "../phone";

describe("toE164", () => {
  it("normalizes local 9-digit numbers", () => {
    expect(toE164("971234567")).toBe("+260971234567");
  });

  it("normalizes numbers already including 260 prefix", () => {
    expect(toE164("260971234567")).toBe("+260971234567");
  });

  it("pads short partial numbers", () => {
    expect(toE164("97")).toBe("+260000000097");
  });

  it("returns bare prefix for empty input", () => {
    expect(toE164("")).toBe("+260");
  });
});

describe("formatPhoneDisplay", () => {
  it("formats a valid E.164 number with spaces", () => {
    expect(formatPhoneDisplay("+260971234567")).toBe("+260 971 234 567");
  });

  it("returns input unchanged when not Zambian prefix", () => {
    expect(formatPhoneDisplay("+44123456789")).toBe("+44123456789");
  });
});

describe("isValidZambianPhone", () => {
  it("accepts +260 plus nine digits", () => {
    expect(isValidZambianPhone("+260971234567")).toBe(true);
  });

  it("rejects wrong length", () => {
    expect(isValidZambianPhone("+26097123")).toBe(false);
  });
});
