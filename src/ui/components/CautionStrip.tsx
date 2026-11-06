import { useId, useRef, useState } from "react";
import { uniqueCautions } from "../cautions";

interface CautionStripProps {
  label: string;
  messages: string[];
  testIdPrefix: string;
}

/**
 * Compact horizontal strip of caution chips. Every message is reachable by click or keyboard and
 * its full text is shown in the expanded view; nothing is truncated without a way to read it.
 */
export function CautionStrip({ label, messages: suppliedMessages, testIdPrefix }: CautionStripProps) {
  const messages = uniqueCautions(suppliedMessages);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [isShowingAll, setIsShowingAll] = useState(false);
  const scrollerRef = useRef<HTMLUListElement | null>(null);
  const detailId = useId();

  if (messages.length === 0) return null;

  function scrollChips(direction: 1 | -1) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({
      left: direction * Math.max(160, scroller.clientWidth * 0.7),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }

  const expandedMessage = selectedMessage && messages.includes(selectedMessage) ? selectedMessage : null;

  return (
    <section className="ncc-cautions" aria-label={label} data-testid={testIdPrefix}>
      <div className="ncc-cautions-bar">
        <span className="ncc-cautions-label">{label} <span className="ncc-cautions-count">{messages.length}</span></span>
        <button type="button" className="ncc-icon-button" onClick={() => scrollChips(-1)} aria-label={"Scroll " + label.toLowerCase() + " left"} data-testid={testIdPrefix + "-scroll-left"}>
          <span aria-hidden="true">&lsaquo;</span>
        </button>
        <ul className="ncc-cautions-scroller" ref={scrollerRef}>
          {messages.map((messageText, messageIndex) => {
            const isExpanded = messageText === expandedMessage && !isShowingAll;
            return (
              <li key={messageText}>
                <button
                  id={detailId + "-chip-" + messageIndex}
                  type="button"
                  className={"ncc-caution-chip" + (isExpanded ? " is-expanded" : "")}
                  aria-expanded={isExpanded}
                  aria-controls={detailId}
                  aria-label={(isExpanded ? "Hide caution: " : "Read caution: ") + messageText}
                  onClick={() => {
                    setIsShowingAll(false);
                    setSelectedMessage(current => current === messageText ? null : messageText);
                  }}
                  data-testid={testIdPrefix + "-chip-" + messageIndex}
                >
                  <span className="ncc-caution-chip-text">{messageText}</span>
                  <span className={"ncc-inspect-chevron" + (isExpanded ? " is-open" : "")} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" className="ncc-icon-button" onClick={() => scrollChips(1)} aria-label={"Scroll " + label.toLowerCase() + " right"} data-testid={testIdPrefix + "-scroll-right"}>
          <span aria-hidden="true">&rsaquo;</span>
        </button>
        <button
          type="button"
          className="ncc-link-button ncc-cautions-all"
          aria-expanded={isShowingAll}
          aria-controls={detailId}
          onClick={() => { setIsShowingAll(current => !current); setSelectedMessage(null); }}
          data-testid={testIdPrefix + "-toggle-all"}
        >
          {isShowingAll ? "Hide" : "Show all"}
        </button>
      </div>
      <div id={detailId} aria-live="polite">
        {isShowingAll && (
          <ol className="ncc-cautions-detail">
            {messages.map((messageText, messageIndex) => <li key={messageIndex}>{messageText}</li>)}
          </ol>
        )}
        {!isShowingAll && expandedMessage && (
          <p className="ncc-cautions-detail" data-testid={testIdPrefix + "-detail"}>{expandedMessage}</p>
        )}
      </div>
    </section>
  );
}
