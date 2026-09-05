import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { appIconElement } from "@/lib/branding/app-icon";

// app/manifest.ts's `icons` array needs specific pixel sizes (192, 512) that
// the single-size app/icon.tsx / app/apple-icon.tsx conventions can't provide
// on their own — this route renders the same placeholder mark at whatever
// `?size=` the manifest asks for.
export async function GET(request: NextRequest) {
  const size = Number(request.nextUrl.searchParams.get("size")) || 512;
  return new ImageResponse(appIconElement(size), { width: size, height: size });
}
