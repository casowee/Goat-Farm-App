import type { MetadataRoute } from "next";

// UPD-011 (11c) — Next's native manifest route, the main lever (alongside the
// `appleWebApp` metadata in app/layout.tsx) for the installed icon to launch
// standalone with no browser chrome, instead of feeling like a website opened
// in Safari. `theme_color`/`background_color` match ui-context.md's dark
// palette (`--bg-base` / `--bg-surface`). Icons are a generated placeholder
// mark in the desert accent color (owner-confirmed acceptable for now, no
// real brand logo yet) — swap `lib/branding/app-icon.tsx` for real artwork
// later with no other change needed here.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Goat Farm Manager",
    short_name: "Goat Farm",
    description: "Manage goats, health, breeding, inventory, and sales.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0A09",
    theme_color: "#141210",
    icons: [
      {
        src: "/manifest-icon?size=192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/manifest-icon?size=512",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/manifest-icon?size=512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
