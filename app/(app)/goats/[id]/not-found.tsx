import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Shown when a goat id doesn't resolve to one of the owner's goats — a bad id,
// a stale link, or (UPD-008) a goat that was just removed as "Wrong
// registration" from its own profile. Rendered inside the (app) layout so the
// sidebar stays, rather than falling through to the framework's bare 404.
export default function GoatNotFound() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<Link href="/goats" />}
      >
        <ArrowLeft />
        Back to Goats
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Goat not found</CardTitle>
          <CardDescription>
            This goat doesn&apos;t exist or has been removed. Head back to the
            goats list to keep going.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
