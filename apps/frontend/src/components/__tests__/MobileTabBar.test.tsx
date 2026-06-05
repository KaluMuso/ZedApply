import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileTabBar } from "../MobileTabBar";

const mockPush = vi.fn();
const mockLogout = vi.fn();
const mockToggle = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/jobs"),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: () => void;
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    logout: mockLogout,
    token: "tok",
  }),
}));

vi.mock("@/components/ThemeProvider", () => ({
  useTheme: () => ({ dark: true, toggle: mockToggle }),
}));

vi.mock("@/lib/api", () => ({
  profile: {
    get: vi.fn().mockResolvedValue({
      full_name: "Jane Banda",
      subscription_tier: "professional",
      role: "user",
    }),
  },
  subscription: {
    get: vi.fn().mockResolvedValue({
      matches_used: 5,
      matches_limit: 125,
    }),
  },
}));

describe("MobileTabBar", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockLogout.mockClear();
    mockToggle.mockClear();
  });

  it("renders five bottom tabs on authenticated job pages", () => {
    render(<MobileTabBar />);
    expect(screen.getByLabelText(/mobile navigation/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jobs", hidden: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Matches", hidden: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Applications", hidden: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Profile", hidden: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More", hidden: true })).toBeInTheDocument();
    expect(screen.getByText("Apps")).toBeInTheDocument();
  });

  it("opens More sheet with essentials, theme toggle, and sign out", async () => {
    const user = userEvent.setup();
    render(<MobileTabBar />);
    await user.click(screen.getByRole("button", { name: "More", hidden: true }));

    const moreNav = await screen.findByRole("navigation", { name: /more navigation/i });
    expect(moreNav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: /settings/i })).toHaveAttribute(
      "href",
      "/settings/account",
    );
    expect(screen.getByRole("link", { name: /pricing/i })).toHaveAttribute(
      "href",
      "/pricing",
    );
    expect(screen.queryByRole("link", { name: /interview prep/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /light mode/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });
});
