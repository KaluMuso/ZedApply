import type { ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { AuthProvider } from "@/lib/auth";
import { SavedJobsProvider } from "@/lib/SavedJobsProvider";

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <AuthProvider>
        <SavedJobsProvider>{children}</SavedJobsProvider>
      </AuthProvider>
    ),
    ...options,
  });
}
