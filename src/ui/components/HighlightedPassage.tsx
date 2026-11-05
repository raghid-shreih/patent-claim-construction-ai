import { locateQuoteInPassage } from "../text/locate-quote";

interface HighlightedPassageProps {
  passageText: string;
  quoteText: string;
}

/** Shows the actual source passage, marking the cited quote where it appears verbatim. */
export function HighlightedPassage({ passageText, quoteText }: HighlightedPassageProps) {
  const quoteLocation = locateQuoteInPassage(passageText, quoteText);

  if (!quoteLocation) {
    return (
      <div className="ncc-passage-block">
        <p className="ncc-quote-missing" role="note">
          The cited quote was not found word-for-word in this source. Read the passage directly before relying on it.
        </p>
        <pre className="ncc-passage">{passageText}</pre>
      </div>
    );
  }

  const textBeforeQuote = passageText.slice(0, quoteLocation.startIndex);
  const quotedText = passageText.slice(quoteLocation.startIndex, quoteLocation.endIndex);
  const textAfterQuote = passageText.slice(quoteLocation.endIndex);

  return (
    <pre className="ncc-passage">
      {textBeforeQuote}
      <mark
        className="ncc-quote-mark"
        ref={(markElement) => markElement?.scrollIntoView({ block: "nearest", behavior: "smooth" })}
      >
        {quotedText}
      </mark>
      {textAfterQuote}
    </pre>
  );
}
