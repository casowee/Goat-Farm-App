import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Goat Farm Manager",
  description: "Manage goats, health, breeding, inventory, and sales.",
  // UPD-011 (11c) — generates the legacy Apple meta tags iOS Safari still
  // relies on for full-screen, standalone launch behavior when installed via
  // "Add to Home Screen" — the app/manifest.ts route covers Android/Chrome.
  // `black-translucent` matches the dark theme (owner-confirmed): the status
  // bar overlays the app rather than sitting in an opaque bar above it.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Goat Farm",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
