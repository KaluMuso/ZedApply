import { describe, expect, it } from "vitest";
import { resolveApplyAction, resolveApplyActionOrSupport } from "@/lib/applyLink";

describe("resolveApplyAction", () => {
  it("apply_link_email_mode_opens_mailto", () => {
    const action = resolveApplyAction({
      title: "Supervisor",
      company: "Mika Meats",
      apply_email: "recruitments@mikameats.com",
      apply_source: "description_email",
    });
    expect(action?.label).toBe("Email application");
    expect(action?.href).toMatch(/^mailto:recruitments@mikameats\.com/);
    expect(action?.external).toBe(false);
  });

  it("apply_link_url_mode_opens_external", () => {
    const action = resolveApplyAction({
      title: "Analyst",
      apply_url: "https://jobs.example.com/apply",
    });
    expect(action?.label).toBe("Apply on company site");
    expect(action?.href).toBe("https://jobs.example.com/apply");
    expect(action?.external).toBe(true);
  });

  it("returns_null_when_no_structured_contact", () => {
    const action = resolveApplyAction({
      title: "Role",
      source_url: "https://aggregator.example/job/1",
    });
    expect(action).toBeNull();
  });

  it("prefers_url_over_email", () => {
    const action = resolveApplyAction({
      title: "Role",
      apply_url: "https://jobs.example.com/apply",
      apply_email: "hr@co.com",
    });
    expect(action?.label).toBe("Apply on company site");
    expect(action?.secondary).toBeUndefined();
  });

  it("phone_contact_opens_tel_with_whatsapp_secondary", () => {
    const action = resolveApplyAction({
      title: "Driver",
      contact_phone: "0971234567",
    });
    expect(action?.label).toBe("Call/WhatsApp");
    expect(action?.href).toBe("tel:+260971234567");
    expect(action?.secondary?.href).toBe("https://wa.me/260971234567");
  });
});

describe("resolveApplyActionOrSupport", () => {
  it("falls_back_to_support_mail_when_no_contact", () => {
    const action = resolveApplyActionOrSupport({
      title: "Role",
      source_url: "https://aggregator.example/job/1",
    });
    expect(action.label).toBe("Contact Support");
    expect(action.applySource).toBe("source_fallback");
    expect(action.href).toMatch(/^mailto:support@zedapply\.com/);
  });
});
