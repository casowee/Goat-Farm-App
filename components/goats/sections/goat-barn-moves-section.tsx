import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarnMoveHistory,
  type BarnMove,
} from "@/components/goats/barn-move-history";

/**
 * Spec 17.3 (§5D) — the barn move history card, streamed on its own.
 *
 * Its one query is scoped to this goat and independent of everything else on the
 * page, which makes it a natural boundary: it no longer delays the header above
 * it, and it no longer waits on the tabs below it.
 */
export async function GoatBarnMovesSection({ goatId }: { goatId: number }) {
  const supabase = await createClient();
  // RLS scopes this to the signed-in owner's goats.
  const { data: barnMoves } = await supabase
    .from("goat_barn_moves")
    .select(
      "id, moved_on, note, from_barn:barns!goat_barn_moves_from_barn_id_fkey(name), to_barn:barns!goat_barn_moves_to_barn_id_fkey(name)",
    )
    .eq("goat_id", goatId)
    .order("moved_on", { ascending: false })
    .order("id", { ascending: false });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-copy-secondary">
          Barn move history
        </CardTitle>
      </CardHeader>
      <CardContent>
        <BarnMoveHistory moves={(barnMoves ?? []) as BarnMove[]} />
      </CardContent>
    </Card>
  );
}
