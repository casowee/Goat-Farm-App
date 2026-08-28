import { ArrowRight } from "lucide-react";

export interface BarnMove {
  id: number;
  moved_on: string;
  note: string | null;
  from_barn: { name: string } | null;
  to_barn: { name: string } | null;
}

export function BarnMoveHistory({ moves }: { moves: BarnMove[] }) {
  if (moves.length === 0) {
    return (
      <p className="text-sm text-copy-muted">
        No barn moves recorded. Use “Move barn” to move this goat and start its
        history.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {moves.map((move) => (
        <li
          key={move.id}
          className="flex flex-col gap-1 rounded-xl border border-surface-border bg-subtle px-3 py-2"
        >
          <div className="flex flex-wrap items-center gap-2 text-sm text-copy-primary">
            <span>{move.from_barn?.name ?? "Unknown"}</span>
            <ArrowRight className="h-4 w-4 text-copy-muted" />
            <span>{move.to_barn?.name ?? "Unknown"}</span>
            <span className="text-xs text-copy-muted">· {move.moved_on}</span>
          </div>
          {move.note && (
            <p className="text-xs text-copy-secondary">{move.note}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
