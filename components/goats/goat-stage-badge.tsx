import { Badge } from "@/components/ui/badge";
import { deriveGoatStage, type GoatSex, type ReproductiveState } from "@/lib/goats/stage";

interface GoatStageBadgeProps {
  sex: GoatSex;
  reproductiveState: ReproductiveState;
  dateOfBirth: string;
}

export function GoatStageBadge({
  sex,
  reproductiveState,
  dateOfBirth,
}: GoatStageBadgeProps) {
  const stage = deriveGoatStage({
    sex,
    reproductiveState,
    dateOfBirth,
  });

  return (
    <Badge className="border-transparent bg-accent-dim text-brand">
      {stage}
    </Badge>
  );
}
