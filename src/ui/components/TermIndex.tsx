import type { ClaimTermInterpretation } from "../contract-types";
import { BasisBadge } from "./BasisBadge";

interface TermIndexProps {
  terms: ClaimTermInterpretation[];
  selectedTermIndex: number | null;
  onSelectTerm: (termIndex: number) => void;
}

export function TermIndex({ terms, selectedTermIndex, onSelectTerm }: TermIndexProps) {
  if (terms.length === 0) {
    return <p className="ncc-muted">No terms were identified for construction in this claim.</p>;
  }
  return (
    <ul className="ncc-term-index" aria-label="Construed terms">
      {terms.map((termEntry, termIndex) => {
        const isSelected = termIndex === selectedTermIndex;
        return (
          <li key={termEntry.term + termIndex}>
            <button
              type="button"
              className={"ncc-term-card" + (isSelected ? " is-selected" : "")}
              aria-pressed={isSelected}
              onClick={() => onSelectTerm(termIndex)}
              data-testid={"button-term-" + termIndex}
            >
              <span className="ncc-term-head">
                <span className="ncc-term-name">{termEntry.term}</span>
                <BasisBadge basis={termEntry.basis} />
              </span>
              <span className="ncc-term-meaning">{termEntry.meaning}</span>
              <span className="ncc-term-count ncc-mono">
                {termEntry.evidence.length === 0
                  ? "no cited support"
                  : termEntry.evidence.length + " cited passage" + (termEntry.evidence.length === 1 ? "" : "s")}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
