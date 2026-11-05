import type { ClaimSourcePage } from "../contract-types";
import { MAXIMUM_CHARACTERS_PER_PAGE, assertPagesWithinTextLimits } from "../input-limits";

/**
 * Splits pasted text into pages no longer than the per-page limit,
 * breaking at paragraph or line boundaries so no passage is cut mid-sentence where avoidable.
 * The full text is kept; the aggregate and page-count limits are then enforced.
 */
export function splitPastedTextIntoPages(pastedText: string): ClaimSourcePage[] {
  const normalizedText = pastedText.replace(/\r\n?/g, "\n").trim();
  const pageTexts: string[] = [];
  let remainingText = normalizedText;

  while (remainingText.length > MAXIMUM_CHARACTERS_PER_PAGE) {
    const window = remainingText.slice(0, MAXIMUM_CHARACTERS_PER_PAGE);
    let breakIndex = window.lastIndexOf("\n\n");
    if (breakIndex < MAXIMUM_CHARACTERS_PER_PAGE / 2) breakIndex = window.lastIndexOf("\n");
    if (breakIndex < MAXIMUM_CHARACTERS_PER_PAGE / 2) breakIndex = window.lastIndexOf(" ");
    if (breakIndex <= 0) breakIndex = MAXIMUM_CHARACTERS_PER_PAGE;
    pageTexts.push(remainingText.slice(0, breakIndex));
    remainingText = remainingText.slice(breakIndex);
  }
  if (remainingText.length > 0) pageTexts.push(remainingText);

  const pages = pageTexts.map((pageText, pageIndex) => ({ pageNumber: pageIndex + 1, text: pageText }));
  assertPagesWithinTextLimits(pages);
  return pages;
}
