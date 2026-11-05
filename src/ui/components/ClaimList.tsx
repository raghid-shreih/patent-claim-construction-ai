import type { KeyboardEvent } from "react";
import type { DetectedClaim } from "../contract-types";

interface ClaimListProps {
  claims: DetectedClaim[];
  selectedClaimNumber: number | null;
  analyzedClaimNumbers: Set<number>;
  onSelectClaim: (claimNumber: number) => void;
}

function describeDependency(claim: DetectedClaim): string {
  if (claim.dependsOn.length === 0) return "Independent";
  return "Depends on " + claim.dependsOn.map((parentNumber) => "claim " + parentNumber).join(", ");
}

export function ClaimList({ claims, selectedClaimNumber, analyzedClaimNumbers, onSelectClaim }: ClaimListProps) {
  function moveSelectionWithArrows(keyboardEvent: KeyboardEvent<HTMLButtonElement>, claimIndex: number) {
    const offsetByKey: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };
    const offset = offsetByKey[keyboardEvent.key];
    if (offset === undefined) return;
    keyboardEvent.preventDefault();
    const nextClaim = claims[claimIndex + offset];
    if (!nextClaim) return;
    onSelectClaim(nextClaim.number);
    const siblingButtons = keyboardEvent.currentTarget.parentElement?.parentElement?.querySelectorAll("button");
    (siblingButtons?.[claimIndex + offset] as HTMLButtonElement | undefined)?.focus();
  }

  if (claims.length === 0) {
    return (
      <div className="ncc-empty">
        <p className="ncc-empty-title">No numbered claims were detected.</p>
        <p className="ncc-muted">
          Claims are found after a standalone "Claims" or "What is claimed is:" heading, with each claim starting on a new line as "1.", "2." and so on.
        </p>
      </div>
    );
  }

  return (
    <ol className="ncc-claim-list" aria-label="Detected claims">
      {claims.map((claim, claimIndex) => {
        const isSelected = claim.number === selectedClaimNumber;
        return (
          <li key={claim.number}>
            <button
              type="button"
              className={"ncc-claim-item" + (isSelected ? " is-selected" : "")}
              aria-pressed={isSelected}
              onClick={() => onSelectClaim(claim.number)}
              onKeyDown={(keyboardEvent) => moveSelectionWithArrows(keyboardEvent, claimIndex)}
              data-testid={"button-claim-" + claim.number}
            >
              <span className="ncc-claim-number">{claim.number}</span>
              <span className="ncc-claim-body">
                <span className="ncc-claim-meta">
                  {describeDependency(claim)}
                  {analyzedClaimNumbers.has(claim.number) && <span className="ncc-claim-read"> / read</span>}
                </span>
                <span className="ncc-claim-preview">{claim.text}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
