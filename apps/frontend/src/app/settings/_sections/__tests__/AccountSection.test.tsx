import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { notify } from "@/lib/toast";

const mockProfileGet = vi.fn();
const mockProfileUpdate = vi.fn();
const mockPrefsGet = vi.fn();
const mockPrefsPatch = vi.fn();

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ token: "test-token", isAuthenticated: true, isLoading: false }),
}));

const mockProfile = {
  id: "u1",
  phone: "+260971234567",
  full_name: "Jane Doe",
  email: "jane@example.com",
  skills: [],
  cv_uploaded: true,
  subscription_tier: "free",
  location: "Lusaka",
};

const mockPrefs = {
  whatsapp_number: null,
  location: "Lusaka",
  currency: "ZMW" as const,
  alert_frequency: "daily" as const,
  whatsapp_verified: false,
  preferred_notification_channel: "email" as const,
  whatsapp_digest_available: false,
  quiet_hours_start: "20:00",
  quiet_hours_end: "07:00",
  profile_visible_to_employers: true,
  hidden_employer_name: null,
  notify_product_updates: false,
  display_timezone: "Africa/Lusaka",
};

vi.mock("@/lib/api", () => ({
  profile: {
    get: (...args: unknown[]) => mockProfileGet(...args),
    update: (...args: unknown[]) => mockProfileUpdate(...args),
  },
  userPreferences: {
    get: (...args: unknown[]) => mockPrefsGet(...args),
    patch: (...args: unknown[]) => mockPrefsPatch(...args),
  },
}));

vi.mock("@/lib/toast", () => ({
  notify: {
    error: vi.fn(),
    custom: { success: vi.fn() },
  },
}));

import { AccountSection } from "../AccountSection";

describe("AccountSection", () => {
  beforeEach(() => {
    mockProfileGet.mockResolvedValue(mockProfile);
    mockPrefsGet.mockResolvedValue(mockPrefs);
    mockProfileUpdate.mockResolvedValue({
      ...mockProfile,
      full_name: "Jane Updated",
    });
    mockPrefsPatch.mockResolvedValue({
      ...mockPrefs,
      currency: "USD",
    });
  });

  it("shows loading then account details", async () => {
    render(<AccountSection />);
    expect(screen.getByText(/loading account/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText("Jane Doe").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("+260971234567")).toBeInTheDocument();
  });

  it("edits full name through save flow", async () => {
    const user = userEvent.setup();
    render(<AccountSection />);
    await waitFor(() => expect(screen.getAllByText("Jane Doe").length).toBeGreaterThan(0));

    await user.click(screen.getAllByRole("button", { name: /edit/i })[0]);
    const input = screen.getByDisplayValue("Jane Doe");
    await user.clear(input);
    await user.type(input, "Jane Updated");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(mockProfileUpdate).toHaveBeenCalledWith("test-token", {
        full_name: "Jane Updated",
      });
    });
    expect(notify.custom.success).toHaveBeenCalledWith("Saved");
    expect(screen.getAllByText("Jane Updated").length).toBeGreaterThan(0);
  });

  it("shows error when profile load fails", async () => {
    mockProfileGet.mockRejectedValueOnce(new Error("Network down"));
    render(<AccountSection />);
    await waitFor(() => {
      expect(notify.error).toHaveBeenCalledWith("Network down");
    });
  });

  it("persists currency change via userPreferences.patch", async () => {
    const user = userEvent.setup();
    render(<AccountSection />);
    await waitFor(() => expect(screen.getAllByText("Jane Doe").length).toBeGreaterThan(0));

    const [currencySelect] = screen.getAllByRole("combobox");
    await user.selectOptions(currencySelect, "USD");
    await waitFor(() => {
      expect(mockPrefsPatch).toHaveBeenCalledWith("test-token", { currency: "USD" });
    });
    expect(notify.custom.success).toHaveBeenCalledWith("Saved");
  });
});
