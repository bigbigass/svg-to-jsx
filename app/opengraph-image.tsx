import { ImageResponse } from "next/og";

export const alt = "SvgJsx — SVG to JSX, React, Vue & Solid component converter";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, opacity: 0.85 }}>&lt;svg&gt; → &lt;Icon /&gt;</div>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 700, marginTop: 24 }}>SvgJsx</div>
        <div style={{ display: "flex", fontSize: 44, marginTop: 16, opacity: 0.95 }}>
          SVG to JSX · React · TSX · React Native · Vue · Solid
        </div>
        <div style={{ display: "flex", fontSize: 30, marginTop: 40, opacity: 0.75 }}>
          Free · runs in your browser · nothing uploaded
        </div>
      </div>
    ),
    size,
  );
}
