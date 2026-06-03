import { describe, expect, it } from "vitest";

import {
  ANIMATION_SPEED_FACTOR,
  HERO_FLOAT_DURATIONS,
} from "@/lib/hero-animation";

describe("hero-animation", () => {
  it("uses 0.67 speed factor for ~50% faster cycles", () => {
    expect(ANIMATION_SPEED_FACTOR).toBe(0.67);
    expect(HERO_FLOAT_DURATIONS.primary).toBe(4.02);
    expect(HERO_FLOAT_DURATIONS.staggered).toBe(4.69);
    expect(HERO_FLOAT_DURATIONS.delay1).toBe(0.34);
    expect(HERO_FLOAT_DURATIONS.delay2).toBe(0.67);
  });
});
