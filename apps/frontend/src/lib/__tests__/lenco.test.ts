import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getLencoScriptUrl,
  isLencoReady,
  lencoPhone,
  openLencoCheckout,
} from "../lenco";

describe("lenco helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete (window as Window & { LencoPay?: unknown }).LencoPay;
  });

  it("prefers WIDGET_URL over SCRIPT_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_LENCO_WIDGET_URL", "https://widget.example/lenco.js");
    vi.stubEnv("NEXT_PUBLIC_LENCO_SCRIPT_URL", "https://script.example/lenco.js");
    expect(getLencoScriptUrl()).toBe("https://widget.example/lenco.js");
  });

  it("falls back to SCRIPT_URL when widget URL is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_LENCO_WIDGET_URL", "");
    vi.stubEnv("NEXT_PUBLIC_LENCO_SCRIPT_URL", "https://script.example/lenco.js");
    expect(getLencoScriptUrl()).toBe("https://script.example/lenco.js");
  });

  it("normalizes Zambian phone numbers for Lenco", () => {
    expect(lencoPhone("+260971234567")).toBe("0971234567");
    expect(lencoPhone("260971234567")).toBe("0971234567");
    expect(lencoPhone("0971234567")).toBe("0971234567");
    expect(lencoPhone(null)).toBe("0961111111");
  });

  it("detects when LencoPay.getPaid is callable", () => {
    expect(isLencoReady()).toBe(false);
    window.LencoPay = { getPaid: vi.fn() };
    expect(isLencoReady()).toBe(true);
  });

  it("rejects invalid amounts before calling getPaid", () => {
    const getPaid = vi.fn();
    window.LencoPay = { getPaid };
    expect(() =>
      openLencoCheckout({
        key: "pub-test",
        reference: "ref-1",
        email: "a@b.com",
        amount: Number.NaN,
      }),
    ).toThrow(/Invalid Lenco amount/);
    expect(getPaid).not.toHaveBeenCalled();
  });

  it("delegates to LencoPay.getPaid with valid options", () => {
    const getPaid = vi.fn();
    window.LencoPay = { getPaid };
    openLencoCheckout({
      key: "pub-test",
      reference: "ref-1",
      email: "a@b.com",
      amount: 125,
      currency: "ZMW",
    });
    expect(getPaid).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 125, currency: "ZMW" }),
    );
  });
});
