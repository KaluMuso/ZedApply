import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileCompletenessChecklist } from "../ProfileCompletenessChecklist";
import type { ProfileCompletenessItem } from "@/lib/profileCompleteness";

vi.mock("@/components/ui/Icon", () => ({
  Icon: () => <span data-testid="icon" />,
}));

const incompleteItems: ProfileCompletenessItem[] = [
  {
    id: "email",
    label: "Email address",
    weight: 1,
    complete: false,
    hint: "Add in Account settings",
    tab: "cv",
  },
  {
    id: "preferred_locations",
    label: "Preferred locations",
    weight: 1,
    complete: false,
    hint: "Add provinces or regions",
    tab: "preferences",
  },
];

describe("ProfileCompletenessChecklist", () => {
  it("renders nothing when all items are complete", () => {
    const complete = incompleteItems.map((item) => ({ ...item, complete: true }));
    const { container } = render(
      <ProfileCompletenessChecklist items={complete} onGoToTab={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("lists incomplete fields and remaining count", () => {
    render(
      <ProfileCompletenessChecklist items={incompleteItems} onGoToTab={vi.fn()} />,
    );
    expect(screen.getByText(/complete your profile \(2 remaining\)/i)).toBeInTheDocument();
    expect(screen.getByText("Email address")).toBeInTheDocument();
    expect(screen.getByText(/add provinces or regions/i)).toBeInTheDocument();
  });

  it("navigates to the correct tab when Add is clicked", async () => {
    const user = userEvent.setup();
    const onGoToTab = vi.fn();
    render(
      <ProfileCompletenessChecklist items={incompleteItems} onGoToTab={onGoToTab} />,
    );
    const addButtons = screen.getAllByRole("button", { name: /add/i });
    await user.click(addButtons[0]);
    expect(onGoToTab).toHaveBeenCalledWith("cv");
    await user.click(addButtons[1]);
    expect(onGoToTab).toHaveBeenCalledWith("preferences");
  });
});
