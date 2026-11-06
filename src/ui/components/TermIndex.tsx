import { useId, type ReactNode } from "react";
import type { ClaimTermInterpretation } from "../contract-types";
import { orderTermsSelectedFirst } from "../term-order";
import { BasisBadge } from "./BasisBadge";

interface TermIndexProps {
  terms: ClaimTermInterpretation[];
  selectedTermIndex: number | null;
  /** Original index of the term promoted to the top of the list; null keeps original order. */
  promotedTermIndex: number | null;
  expandedTermIndex: number | null;
  onToggleInspection: (termIndex: number) => void;
  renderInspection: (termIndex: number) => ReactNode;
}

export function TermIndex({
  terms, selectedTermIndex, promotedTermIndex, expandedTermIndex, onToggleInspection, renderInspection,
}: TermIndexProps) {
  const instanceId = useId();
  if (terms.length === 0) {
    return <p className="ncc-muted">No terms were identified for construction in this claim.</p>;
  }
  const presentedTerms = orderTermsSelectedFirst(terms, promotedTermIndex);
  return (
    <ul className="ncc-term-index" aria-label="Construed terms">
      {presentedTerms.map(({ term: termEntry, originalIndex }) => {
        const isSelected = originalIndex === selectedTermIndex;
        const isExpanded = originalIndex === expandedTermIndex;
        const headingId = `${instanceId}-term-${originalIndex}`;
        const inspectionId = `${instanceId}-inspection-${originalIndex}`;
        const toggleId = `${instanceId}-toggle-${originalIndex}`;
        return (
          <li key={"term-" + originalIndex} className={isSelected ? "is-selected" : undefined}>
            <article className={"ncc-term-card" + (isSelected ? " is-selected" : "")} aria-labelledby={headingId}>
              <div className="ncc-term-head">
                <h4 id={headingId} className="ncc-term-name">{termEntry.term}</h4>
                <BasisBadge basis={termEntry.basis} />
              </div>
              <p className="ncc-term-meaning">{termEntry.meaning}</p>
              <div className="ncc-term-actions">
                <span className="ncc-term-count">
                {termEntry.evidence.length === 0
                  ? "No cited support"
                  : termEntry.evidence.length + " cited passage" + (termEntry.evidence.length === 1 ? "" : "s")}
                </span>
                <button
                  id={toggleId}
                  type="button"
                  className="ncc-inspect-toggle"
                  aria-expanded={isExpanded}
                  aria-controls={inspectionId}
                  aria-label={`${isExpanded ? "Collapse" : "Inspect"} ${termEntry.term}`}
                  onClick={() => onToggleInspection(originalIndex)}
                  data-testid={"button-term-" + originalIndex}
                >
                  {isExpanded ? "Collapse" : "Inspect"}
                  <span className={"ncc-inspect-chevron" + (isExpanded ? " is-open" : "")} aria-hidden="true" />
                </button>
              </div>
              <div id={inspectionId} role="region" aria-labelledby={toggleId} hidden={!isExpanded}>
                {isExpanded && renderInspection(originalIndex)}
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
