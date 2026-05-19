/**
 * OG image padrão pra páginas públicas (landing, pricing, sobre, etc).
 */
import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") ?? "Conteudai";
  const subtitle =
    searchParams.get("subtitle") ?? "Visibilidade automática no Google e ChatGPT";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0a 0%, #171717 100%)",
          padding: "80px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              background: "#5e6ad2",
            }}
          />
          <div style={{ fontSize: 32, color: "#fafafa", fontWeight: 600 }}>Conteudai</div>
        </div>
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            maxWidth: "1000px",
            marginBottom: 24,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#a3a3a3",
            maxWidth: "1000px",
            lineHeight: 1.3,
          }}
        >
          {subtitle}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
