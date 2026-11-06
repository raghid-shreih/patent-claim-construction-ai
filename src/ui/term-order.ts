/** A term paired with its stable index in the interpretation's original term list. */
export interface PresentedTerm<TermValue> {
  term: TermValue;
  originalIndex: number;
}

/**
 * Returns terms in presentation order: the promoted term (if any) first, every other term in
 * its original relative order. Original indexes are preserved so evidence selection, citations,
 * and test identifiers continue to refer to the analysis output unchanged.
 */
export function orderTermsSelectedFirst<TermValue>(
  terms: readonly TermValue[],
  promotedOriginalIndex: number | null,
): PresentedTerm<TermValue>[] {
  const presentedTerms = terms.map((term, originalIndex) => ({ term, originalIndex }));
  if (promotedOriginalIndex === null || promotedOriginalIndex < 0 || promotedOriginalIndex >= terms.length) {
    return presentedTerms;
  }
  const promotedTerm = presentedTerms[promotedOriginalIndex];
  return [promotedTerm, ...presentedTerms.filter((presented) => presented.originalIndex !== promotedOriginalIndex)];
}

/** Case-insensitive claim filter used by the claim selector search box. */
export function filterClaimsByQuery<ClaimValue extends { number: number; text: string }>(
  claims: readonly ClaimValue[],
  query: string,
): ClaimValue[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [...claims];
  const numericQuery = normalizedQuery.replace(/^claim\s*/, "");
  if (/^\d+$/.test(numericQuery)) {
    return claims.filter((claim) => String(claim.number).startsWith(numericQuery));
  }
  return claims.filter((claim) => claim.text.toLowerCase().includes(normalizedQuery));
}
