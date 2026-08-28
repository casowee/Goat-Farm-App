import Link from "next/link";
import type { PedigreeNode } from "@/lib/goats/pedigree";

interface PedigreeViewProps {
  node: PedigreeNode;
  /** Pre-formatted breed label per in-system goat id, shown under the name. */
  breedByGoatId?: Map<number, string>;
}

export function PedigreeView({ node, breedByGoatId }: PedigreeViewProps) {
  return (
    <div className="overflow-x-auto">
      <PedigreeBranch node={node} breedByGoatId={breedByGoatId} isRoot />
    </div>
  );
}

function PedigreeBranch({
  node,
  breedByGoatId,
  isRoot = false,
}: {
  node: PedigreeNode;
  breedByGoatId?: Map<number, string>;
  isRoot?: boolean;
}) {
  const hasParents = Boolean(node.sire || node.dam);

  return (
    <div className="flex flex-col gap-2">
      <NodeCard node={node} breedByGoatId={breedByGoatId} isRoot={isRoot} />
      {hasParents && (
        <div className="ml-3 flex flex-col gap-3 border-l border-surface-border pl-4">
          <ParentSlot
            role="Sire"
            node={node.sire}
            breedByGoatId={breedByGoatId}
          />
          <ParentSlot role="Dam" node={node.dam} breedByGoatId={breedByGoatId} />
        </div>
      )}
    </div>
  );
}

function ParentSlot({
  role,
  node,
  breedByGoatId,
}: {
  role: "Sire" | "Dam";
  node?: PedigreeNode;
  breedByGoatId?: Map<number, string>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs uppercase tracking-wide text-copy-faint">{role}</p>
      {node ? (
        <PedigreeBranch node={node} breedByGoatId={breedByGoatId} />
      ) : (
        <NodeCard node={{ kind: "unknown", label: "Unknown" }} />
      )}
    </div>
  );
}

function NodeCard({
  node,
  breedByGoatId,
  isRoot = false,
}: {
  node: PedigreeNode;
  breedByGoatId?: Map<number, string>;
  isRoot?: boolean;
}) {
  const breed =
    node.kind === "goat" && node.goatId != null
      ? breedByGoatId?.get(node.goatId)
      : undefined;

  const body = (
    <>
      <p
        className={
          node.kind === "unknown"
            ? "text-sm text-copy-muted"
            : "text-sm font-medium text-copy-primary"
        }
      >
        {node.label}
        {node.kind === "external" && (
          <span className="ml-1 text-xs font-normal text-copy-muted">
            (not in the system)
          </span>
        )}
      </p>
      {breed && <p className="text-xs text-copy-muted">{breed}</p>}
    </>
  );

  const className =
    "inline-flex w-fit min-w-40 max-w-full flex-col gap-0.5 rounded-xl border px-3 py-2 " +
    (isRoot
      ? "border-brand bg-accent-dim"
      : "border-surface-border bg-subtle");

  if (node.kind === "goat" && node.goatId != null && !isRoot) {
    return (
      <Link href={`/goats/${node.goatId}`} className={className + " hover:border-brand"}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}
