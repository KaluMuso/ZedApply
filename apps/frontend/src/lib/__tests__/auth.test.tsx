import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { AuthProvider, useAuth } from "../auth";

describe("AuthProvider", () => {
  it("hydrates token from localStorage on mount", async () => {
    localStorage.setItem("zed_cv_token", "jwt-1");
    localStorage.setItem("zed_cv_user_id", "user-1");

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.token).toBe("jwt-1");
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("login stores token and user id", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    act(() => {
      result.current.login("jwt-2", "user-2");
    });

    expect(localStorage.getItem("zed_cv_token")).toBe("jwt-2");
    expect(result.current.user?.id).toBe("user-2");
  });

  it("logout clears session", async () => {
    localStorage.setItem("zed_cv_token", "jwt-1");
    localStorage.setItem("zed_cv_user_id", "user-1");

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    act(() => {
      result.current.logout();
    });

    expect(localStorage.getItem("zed_cv_token")).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("throws when useAuth is used outside provider", () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      /useAuth must be used within AuthProvider/,
    );
  });
});
