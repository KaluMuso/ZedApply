import { describe, expect, it } from "vitest";
import { buildHomeJsonLd } from "@/lib/site-jsonld";

describe("buildHomeJsonLd", () => {
  it("returns Organization and WebSite graphs", () => {
    const graphs = buildHomeJsonLd();
    expect(graphs).toHaveLength(2);
    expect(graphs[0]["@type"]).toBe("Organization");
    expect(graphs[1]["@type"]).toBe("WebSite");
    expect(graphs[1]).toMatchObject({
      potentialAction: {
        "@type": "SearchAction",
      },
    });
  });
});
