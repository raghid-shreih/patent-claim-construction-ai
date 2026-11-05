export interface QuoteLocation {
  startIndex: number;
  endIndex: number;
}

/**
 * Finds a quote inside a passage while ignoring differences in whitespace and letter case.
 * Returns character offsets into the original passage, or null when the quote is not present verbatim.
 */
export function locateQuoteInPassage(passageText: string, quoteText: string): QuoteLocation | null {
  const trimmedQuote = quoteText.trim();
  if (!trimmedQuote) return null;

  const normalizedCharacters: string[] = [];
  const originalIndexForNormalized: number[] = [];
  let previousWasWhitespace = false;
  for (let originalIndex = 0; originalIndex < passageText.length; originalIndex += 1) {
    const character = passageText[originalIndex];
    const isWhitespace = /\s/.test(character);
    if (isWhitespace) {
      if (previousWasWhitespace) continue;
      normalizedCharacters.push(" ");
    } else {
      normalizedCharacters.push(character.toLowerCase());
    }
    originalIndexForNormalized.push(originalIndex);
    previousWasWhitespace = isWhitespace;
  }

  const normalizedPassage = normalizedCharacters.join("");
  const normalizedQuote = trimmedQuote.replace(/\s+/g, " ").toLowerCase();
  const matchStart = normalizedPassage.indexOf(normalizedQuote);
  if (matchStart === -1) return null;

  const matchEnd = matchStart + normalizedQuote.length - 1;
  return {
    startIndex: originalIndexForNormalized[matchStart],
    endIndex: originalIndexForNormalized[matchEnd] + 1,
  };
}

export interface TermOccurrence {
  startIndex: number;
  endIndex: number;
  termIndex: number;
}

/** Finds non-overlapping occurrences of terms in claim text, preferring longer terms first. */
export function findTermOccurrences(claimText: string, terms: string[]): TermOccurrence[] {
  const lowerClaimText = claimText.toLowerCase();
  const termsByLengthDescending = terms
    .map((term, termIndex) => ({ lowerTerm: term.trim().toLowerCase(), termIndex }))
    .filter((entry) => entry.lowerTerm.length > 1)
    .sort((first, second) => second.lowerTerm.length - first.lowerTerm.length);

  const claimedCharacters = new Array<boolean>(claimText.length).fill(false);
  const occurrences: TermOccurrence[] = [];

  for (const { lowerTerm, termIndex } of termsByLengthDescending) {
    let searchFrom = 0;
    while (searchFrom < lowerClaimText.length) {
      const foundAt = lowerClaimText.indexOf(lowerTerm, searchFrom);
      if (foundAt === -1) break;
      const foundEnd = foundAt + lowerTerm.length;
      const precededByLetter = foundAt > 0 && /[a-z0-9]/i.test(claimText[foundAt - 1]);
      const followedByLetter = foundEnd < claimText.length && /[a-z0-9]/i.test(claimText[foundEnd]);
      const overlapsExisting = claimedCharacters.slice(foundAt, foundEnd).some(Boolean);
      if (!precededByLetter && !followedByLetter && !overlapsExisting) {
        occurrences.push({ startIndex: foundAt, endIndex: foundEnd, termIndex });
        for (let index = foundAt; index < foundEnd; index += 1) claimedCharacters[index] = true;
      }
      searchFrom = foundEnd;
    }
  }

  return occurrences.sort((first, second) => first.startIndex - second.startIndex);
}
