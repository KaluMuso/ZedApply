import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockProfileGet = vi.fn();
const mockSubGet = vi.fn();
const mockListPayments = vi.fn();

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

vi.mock("@/lib/api", () => ({
  profile: { get: (...args: unknown[]) => mockProfileGet(...args) },
  subscription: {
    get: (...args: unknown[]) => mockSubGet(...args),
    listPayments: (...args: unknown[]) => mockListPayments(...args),
  },
}));

import { BillingSection } from "../BillingSection";

describe("BillingSection", () => {
  beforeEach(() => {
    mockProfileGet.mockResolvedValue({
      id: "u1",
      phone: "+260971234567",
      full_name: "Jane",
      email: "j@x.com",
      skills: [],
      cv_uploaded: true,
      subscription_tier: "starter",
    });
    mockSubGet.mockResolvedValue({
      tier: "starter",
      matches_used: 12,
      matches_limit: 50,
      active: true,
      expires_at: null,
    });
    mockListPayments.mockResolvedValue({
      payments: [
        {
          id: "pay1",
          amount: 12500,
          currency: "ZMW",
          payment_method: "mtn_money",
          provider: "lenco",
          status: "completed",
          created_at: "2026-05-01T10:00:00Z",
          completed_at: "2026-05-01T10:01:00Z",
        },
      ],
      total: 1,
    });
  });

  it("shows plan and usage after load", async () => {
    render(<BillingSection />);
    expect(screen.getByText(/loading billing/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Starter")).toBeInTheDocument();
    });
    expect(screen.getByText(/12 of 50 matches used/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /upgrade plan/i })).toHaveAttribute(
      "href",
      "/pricing",
    );
  });

  it("lists completed payments as invoices", async () => {
    render(<BillingSection />);
    await waitFor(() => expect(screen.getByText("K125")).toBeInTheDocument());
    expect(screen.getByRole("cell", { name: /paid/i })).toBeInTheDocument();
    expect(screen.getAllByText(/mtn mobile money/i).length).toBeGreaterThan(0);
  });

  it("shows empty invoices copy when no payments", async () => {
    mockListPayments.mockResolvedValueOnce({
      payments: [],
      total: 0,
    });
    render(<BillingSection />);
    await waitFor(() => {
      expect(screen.getByText(/no invoices yet/i)).toBeInTheDocument();
    });
  });

  it("shows welcome bonus copy on free tier", async () => {
    mockProfileGet.mockResolvedValueOnce({
      id: "u1",
      phone: "+260971234567",
      full_name: "Jane",
      email: null,
      skills: [],
      cv_uploaded: false,
      subscription_tier: "free",
    });
    mockSubGet.mockResolvedValueOnce({
      tier: "free",
      matches_used: 2,
      matches_limit: 10,
      active: true,
      expires_at: null,
      welcome_bonus_active: true,
      welcome_match_bonus_until: "2026-06-01T00:00:00Z",
    });
    render(<BillingSection />);
    await waitFor(() => {
      expect(screen.getByText(/welcome bonus/i)).toBeInTheDocument();
    });
  });
});
