import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "MangaVault — One Search, Every Manga Source";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 20% 80%, rgba(120, 80, 200, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(80, 120, 200, 0.15) 0%, transparent 50%)",
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#000000"
              strokeWidth="2.5"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "72px",
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-2px",
            marginBottom: "16px",
          }}
        >
          MangaVault
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "32px",
            color: "#888888",
            marginBottom: "32px",
          }}
        >
          One search. Every source.
        </div>

        {/* Categories */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {["Manga", "Manhwa", "Manhua", "Webtoon", "Donghua"].map((type) => (
            <div
              key={type}
              style={{
                fontSize: "18px",
                color: "#666666",
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #333333",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              {type}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
