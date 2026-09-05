import type { ReactElement } from "react";

// UPD-011 (11c) — a placeholder app icon: the desert accent color as a
// full-bleed square background with a bold monogram, per ui-context.md's own
// note that a simple placeholder mark is fine until a real farm logo exists.
// Shared by app/icon.tsx, app/apple-icon.tsx, and app/manifest-icon/route.tsx
// (via `next/og`'s `ImageResponse`) so all three stay visually identical.
// Deliberately NOT rounded here — iOS applies its own corner mask to
// apple-touch-icon, and Android's maskable icons apply their own shape too;
// pre-rounding would double up or clip against those.
export function appIconElement(size: number): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#D9A05B",
      }}
    >
      <span
        style={{
          fontFamily: "system-ui, sans-serif",
          fontWeight: 700,
          fontSize: Math.round(size * 0.58),
          color: "#0B0A09",
          lineHeight: 1,
        }}
      >
        G
      </span>
    </div>
  );
}
