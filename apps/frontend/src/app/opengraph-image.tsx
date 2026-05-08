import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "ZedApply — AI job matching for Zambia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "linear-gradient(135deg, #052e16 0%, #166534 45%, #15803d 100%)",
          padding: 64,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            maxWidth: 900,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "white",
              lineHeight: 1.1,
            }}
          >
            ZedApply
          </div>
          <div
            style={{
              fontSize: 36,
              color: "rgba(255,255,255,0.92)",
              lineHeight: 1.3,
            }}
          >
            AI job matching in Zambia — results on WhatsApp
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
