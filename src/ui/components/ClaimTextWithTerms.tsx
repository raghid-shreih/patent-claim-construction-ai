import type { ReactNode } from "react";
import type { ClaimTermInterpretation } from "../contract-types";
import { findTermOccurrences } from "../text/locate-quote";

interface ClaimTextWithTermsProps {
  claimText: string;
  terms: ClaimTermInterpretation[];
  selectedTermIndex: number | null;
  onSelectTerm: (termIndex: number) => void;
}

/** Renders claim text with each recognised term occurrence as a clickable button. */
export function ClaimTextWithTerms({ claimText, terms, selectedTermIndex, onSelectTerm }: ClaimTextWithTermsProps) {
  const termOccurrences = findTermOccurrences(claimText, terms.map((termEntry) => termEntry.term));
  const renderedSegments: ReactNode[] = [];
  let cursorIndex = 0;

  termOccurrences.forEach((occurrence, occurrenceIndex) => {
    if (occurrence.startIndex > cursorIndex) renderedSegments.push(claimText.slice(cursorIndex, occurrence.startIndex));
    const occurrenceTerm = terms[occurrence.termIndex];
    const isSelected = occurrence.termIndex === selectedTermIndex;
    renderedSegments.push(
      <button
        key={"occurrence-" + occurrenceIndex}
        type="button"
        className={"ncc-inline-term ncc-inline-" + occurrenceTerm.basis + (isSelected ? " is-selected" : "")}
        onClick={() => onSelectTerm(occurrence.termIndex)}
        aria-label={"Show evidence for " + occurrenceTerm.term}
        data-testid={"button-inline-term-" + occurrenceIndex}
      >
        {claimText.slice(occurrence.startIndex, occurrence.endIndex)}
      </button>,
    );
    cursorIndex = occurrence.endIndex;
  });
  if (cursorIndex < claimText.length) renderedSegments.push(claimText.slice(cursorIndex));

  return <p className="ncc-claim-fulltext">{renderedSegments}</p>;
}
