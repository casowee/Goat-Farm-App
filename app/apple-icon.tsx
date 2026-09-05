import { ImageResponse } from "next/og";
import { appIconElement } from "@/lib/branding/app-icon";

// This is what iOS actually reads for the home-screen icon (Add to Home
// Screen) — separate from app/manifest.ts's `icons` array, which mainly
// matters for Android/Chrome. 180x180 is Apple's standard apple-touch-icon
// size.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(appIconElement(size.width), size);
}
