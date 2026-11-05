import { normalizeWhitespace } from "./document";
import type { ClaimDocument, ClaimInterpretation, ProposedAnalysis, DetectedClaim } from "./contracts";

export const LEGAL_DISCLAIMER = "AI-assisted, specification-based proposed interpretation, not a binding legal construction or legal advice. No prosecution-history review, case-law research, or jurisdiction-specific opinion. Verify with qualified patent counsel.";

export function validateEvidence(
  analysis: ProposedAnalysis,
  document: ClaimDocument,
  selectedClaim: DetectedClaim,
  inheritedClaims: DetectedClaim[],
): ClaimInterpretation {
  const availableSources = new Map(document.sources.map(source => [source.id, source]));
  const claimContext = normalizeWhitespace([selectedClaim, ...inheritedClaims].map(claim => claim.text).join(" ")).toLowerCase();
  const warnings = [...analysis.warnings];
  const terms = analysis.terms.filter(term => {
    const exists = claimContext.includes(normalizeWhitespace(term.term).toLowerCase());
    if (!exists) warnings.push(`An extracted term not present in the claim context was omitted: ${term.term}`);
    return exists;
  }).map(term => {
    let evidence = term.evidence.filter(citation => {
      const source = availableSources.get(citation.sourceId);
      if (!source) return false;
      // Visual observations have no manufactured textual quotation.
      if (source.visual) return term.basis === "visual" && citation.quote === "";
      const quote = normalizeWhitespace(citation.quote);
      return quote.length >= 8 && normalizeWhitespace(source.text).includes(quote);
    });
    if (term.basis === "explicit" || term.basis === "contextual") {
      evidence = evidence.filter(citation => !availableSources.get(citation.sourceId)?.visual);
    }
    if (term.basis === "visual") {
      evidence = evidence.filter(citation => availableSources.get(citation.sourceId)?.visual);
    }
    if (evidence.length !== term.evidence.length) warnings.push(`Unverifiable citations were removed for "${term.term}".`);
    if (!evidence.length) {
      return {
        term: term.term, basis: "unsupported" as const, evidence: [],
        meaning: "No verified supporting evidence was found for this term. No supported construction is offered.",
        caveat: "Check the original patent and obtain professional review; the model's unsupported interpretation was withheld.",
      };
    }
    return { ...term, evidence };
  });
  return {
    claimNumber: selectedClaim.number,
    summary: analysis.summary,
    inheritedClaims: inheritedClaims.map(claim => claim.number),
    terms,
    warnings: [...new Set([...document.warnings, ...warnings])],
    disclaimer: LEGAL_DISCLAIMER,
  };
}
