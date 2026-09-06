import Link from "next/link";
import { Settings2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { BreedingTabs } from "@/components/breeding/breeding-tabs";
import { TopPerformersList } from "@/components/breeding/top-performers-list";
import { computeTopPerformingDoes } from "@/lib/breeding/top-performers";
import type { DoePerformanceGoat } from "@/lib/breeding/doe-performance";

export default async function TopPerformersPage() {
  const supabase = await createClient();

  // RLS scopes this to the signed-in owner.
  const { data: goats } = await supabase
    .from("goats")
    .select(
      "id, tag, name, sex, reproductive_state, date_of_birth, status, dam_id",
    );

  const allGoats = (goats ?? []) as DoePerformanceGoat[];
  const does = computeTopPerformingDoes(allGoats);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-copy-primary">Breeding</h1>
        <Button
          render={<Link href="/breeding/settings" />}
          variant="outline"
          size="sm"
          nativeButton={false}
        >
          <Settings2 className="h-4 w-4" />
          Settings
        </Button>
      </div>

      <BreedingTabs />

      <div className="flex flex-col gap-1">
        <p className="text-sm text-copy-muted">
          Your currently-active does, ranked by the total number of kids ever
          born to them (every kid, whatever its life status now). Tap a doe to
          open her profile.
        </p>
      </div>

      <TopPerformersList does={does} />
    </div>
  );
}
