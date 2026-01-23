import { ImageResponse } from "next/og";
import { site } from "@/config/site";

// Image metadata
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

// Default OG image generation for the entire app
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          letterSpacing: "-.02em",
          fontWeight: 700,
          background: "white",
        }}
      >
        <div
          style={{
            top: 100,
            left: 100,
            position: "absolute",
            display: "flex",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 64,
              lineHeight: 1.5,
            }}
          >
            {site.defaultTitle}
          </span>
        </div>
        <div
          style={{
            bottom: 100,
            left: 100,
            position: "absolute",
            display: "flex",
            alignItems: "center",
          }}
        >
          <span
            style={{
              width: 48,
              height: 48,
              background: "black",
            }}
          />
          <span
            style={{
              marginLeft: 28,
              fontSize: 64,
            }}
          >
            {site.domain}
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
