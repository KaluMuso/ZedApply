import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";

import PricingPage from "../page";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/msw/server";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

beforeEach(() => {
  server.use(
    http.get(`${API}/tiers`, () =>
      HttpResponse.json({
        tiers: [
          { tier: "free", display_name: "Free", price_ngwee: 0, matches_limit: 10 },
          { tier: "starter", display_name: "Starter", price_ngwee: 12500, matches_limit: 50 },
        ],
      })
    )
  );
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/pricing",
}));

vi.mock("next/script", () => ({
  default: () => null,
}));

function atWidth(width: number, ui: React.ReactElement) {
  return renderWithProviders(
    <div style={{ width, maxWidth: width }} data-testid="viewport-root">
      {ui}
    </div>
  );
}

describe("PricingPage responsive layout", () => {
  it("matches 380px mobile snapshot", () => {
    const { getByTestId } = atWidth(380, <PricingPage />);
    expect(getByTestId("viewport-root")).toMatchSnapshot();
  });

  it("matches 1024px desktop snapshot", () => {
    const { getByTestId } = atWidth(1024, <PricingPage />);
    expect(getByTestId("viewport-root")).toMatchSnapshot();
  });
});
