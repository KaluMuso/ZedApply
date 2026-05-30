import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockPushSubscribe = vi.fn();

vi.mock("@/lib/api", () => ({
  push: {
    subscribe: (...args: unknown[]) => mockPushSubscribe(...args),
  },
}));

import {
  hasVisitedMatchesPage,
  isEligibleForPushPrompt,
  PUSH_UX_STORAGE,
  markMatchesPageVisited,
  recordPushDeclined,
  requestPushPermissionAndSubscribe,
  subscribeToWebPush,
} from "@/lib/pushNotifications";

const TEST_VAPID_PUBLIC_KEY =
  "BNcRdreALRer5YNAguF8b0XUqK2mF6p3x8zJ1n5WQKJ8vH7dT2xY9cL4pN6rM0sT1uV2wX3yZ4aB5cD6eF7gH8";

describe("pushNotifications UX gates", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("never prompts without a credited match", () => {
    markMatchesPageVisited();
    vi.stubGlobal("Notification", { permission: "default" });
    vi.stubGlobal("navigator", { serviceWorker: {} });
    expect(isEligibleForPushPrompt(0)).toBe(false);
  });

  it("never prompts before matches page visit", () => {
    vi.stubGlobal("Notification", { permission: "default" });
    vi.stubGlobal("navigator", { serviceWorker: {} });
    expect(isEligibleForPushPrompt(3)).toBe(false);
  });

  it("prompts after credit + visit when permission is default", () => {
    markMatchesPageVisited();
    vi.stubGlobal("Notification", { permission: "default" });
    vi.stubGlobal("navigator", { serviceWorker: {} });
    expect(isEligibleForPushPrompt(1)).toBe(true);
  });

  it("respects 30-day decline cooldown", () => {
    markMatchesPageVisited();
    const thirtyOneDaysMs = 31 * 24 * 60 * 60 * 1000;
    localStorage.setItem(
      PUSH_UX_STORAGE.declinedAt,
      new Date(Date.now() - thirtyOneDaysMs).toISOString(),
    );
    vi.stubGlobal("Notification", { permission: "default" });
    vi.stubGlobal("navigator", { serviceWorker: {} });
    expect(isEligibleForPushPrompt(2)).toBe(true);

    recordPushDeclined();
    expect(isEligibleForPushPrompt(2)).toBe(false);
  });

  it("tracks matches page visit in localStorage", () => {
    expect(hasVisitedMatchesPage()).toBe(false);
    markMatchesPageVisited();
    expect(hasVisitedMatchesPage()).toBe(true);
  });
});

describe("subscribeToWebPush", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", TEST_VAPID_PUBLIC_KEY);
    mockPushSubscribe.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    mockPushSubscribe.mockReset();
  });

  function stubPushSubscription(existing: boolean) {
    const subscription = {
      toJSON: () => ({
        endpoint: "https://push.example/ep",
        keys: { p256dh: "p256dh-key", auth: "auth-key" },
        expirationTime: null,
      }),
    };
    const pushManager = {
      getSubscription: vi.fn().mockResolvedValue(existing ? subscription : null),
      subscribe: vi.fn().mockResolvedValue(subscription),
    };
    vi.stubGlobal("navigator", {
      serviceWorker: { ready: Promise.resolve({ pushManager }) },
    });
    return { pushManager, subscription };
  }

  it("creates subscription and syncs keys to backend", async () => {
    const { pushManager } = stubPushSubscription(false);
    await expect(subscribeToWebPush("tok-1")).resolves.toBe(true);
    expect(pushManager.subscribe).toHaveBeenCalledOnce();
    expect(mockPushSubscribe).toHaveBeenCalledWith("tok-1", {
      endpoint: "https://push.example/ep",
      keys: { p256dh: "p256dh-key", auth: "auth-key" },
      expirationTime: null,
    });
  });

  it("reuses existing browser subscription", async () => {
    const { pushManager } = stubPushSubscription(true);
    await subscribeToWebPush("tok-2");
    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(mockPushSubscribe).toHaveBeenCalledOnce();
  });
});

describe("requestPushPermissionAndSubscribe", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", TEST_VAPID_PUBLIC_KEY);
    mockPushSubscribe.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    mockPushSubscribe.mockReset();
  });

  it("returns unsupported when Notification API is missing", async () => {
    await expect(requestPushPermissionAndSubscribe("tok")).resolves.toBe("unsupported");
  });

  it("returns denied when permission is not granted", async () => {
    vi.stubGlobal("Notification", {
      requestPermission: vi.fn().mockResolvedValue("denied"),
    });
    await expect(requestPushPermissionAndSubscribe("tok")).resolves.toBe("denied");
  });

  it("subscribes when permission is granted", async () => {
    const subscription = {
      toJSON: () => ({
        endpoint: "https://push.example/ep",
        keys: { p256dh: "p256dh-key", auth: "auth-key" },
        expirationTime: null,
      }),
    };
    vi.stubGlobal("Notification", {
      requestPermission: vi.fn().mockResolvedValue("granted"),
    });
    vi.stubGlobal("navigator", {
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(subscription),
            subscribe: vi.fn(),
          },
        }),
      },
    });
    await expect(requestPushPermissionAndSubscribe("tok")).resolves.toBe("granted");
    expect(mockPushSubscribe).toHaveBeenCalledOnce();
  });
});
