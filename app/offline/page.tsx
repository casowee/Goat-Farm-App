"use client";

import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Spec 17.1 §8 — the fallback public/sw.js precaches on install and serves when
// a page has never been visited and the network is gone. It must stay fully
// static: no data fetching, no auth, no Supabase import, or it could not be
// cached ahead of time. It is a client component only for the reload button.
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-base px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-dim text-brand">
            <WifiOff className="h-5 w-5" />
          </div>
          <CardTitle>No connection</CardTitle>
          <CardDescription>
            Pages you&rsquo;ve opened recently are still available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={() => window.location.reload()}
          >
            Try again
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
