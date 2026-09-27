import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed the `middleware.ts` convention to `proxy.ts`
// (see node_modules/next/dist/docs/.../file-conventions/proxy.md).
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // UPD-011 (11c) — app-shell routes (the manifest + its generated icons)
    // must stay reachable without a session: the browser/OS fetches them to
    // decide how the installed icon should look and launch, not as an
    // authenticated page view. Redirecting them to /login would break the
    // installed icon (Chrome/iOS would fetch HTML where an image is expected).
    // Spec 17.1 (§7) — `sw.js` and `offline` join the list for the same
    // reason: the browser fetches the service worker and its precached offline
    // fallback outside any page view, and while signed out (the worker also
    // updates itself after sign-out). Redirecting either to /login would stop
    // the worker registering at all and leave the offline fallback unreachable.
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest-icon|manifest.webmanifest|sw.js|offline|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
