import type { ClaimDocument, ClaimTermInterpretation } from "../contract-types";
import type { LoadedPdfDocument } from "../pdf/pdf-runtime";
import { BASIS_DESCRIPTIONS } from "./BasisBadge";
import { HighlightedPassage } from "./HighlightedPassage";
import { PdfPageCanvas } from "./PdfPageCanvas";

interface EvidencePanelProps {
  preparedDocument: ClaimDocument;
  selectedTerm: ClaimTermInterpretation | null;
  selectedEvidenceIndex: number;
  loadedPdfDocument: LoadedPdfDocument | null;
  pdfBlobUrl: string | null;
  onSelectEvidence: (evidenceIndex: number) => void;
}

export function EvidencePanel({
  preparedDocument,
  selectedTerm,
  selectedEvidenceIndex,
  loadedPdfDocument,
  pdfBlobUrl,
  onSelectEvidence,
}: EvidencePanelProps) {
  if (!selectedTerm) {
    return (
      <div className="ncc-evidence-empty">
        <p className="ncc-empty-title">Choose a term to inspect its support.</p>
        <p className="ncc-muted">Cited passages and pages from the document appear here, side by side with the quote.</p>
      </div>
    );
  }

  const isUnsupported = selectedTerm.basis === "unsupported" || selectedTerm.evidence.length === 0;
  const activeEvidence = selectedTerm.evidence[selectedEvidenceIndex] ?? null;
  const activeSource = activeEvidence
    ? preparedDocument.sources.find((source) => source.id === activeEvidence.sourceId) ?? null
    : null;
  const activePageImage = activeSource
    ? preparedDocument.pages.find((page) => page.pageNumber === activeSource.pageNumber)?.imageDataUrl
    : undefined;

  return (
    <div className="ncc-evidence" aria-live="polite">
      <header className="ncc-evidence-head">
        <p className="ncc-muted ncc-small">{BASIS_DESCRIPTIONS[selectedTerm.basis].explanation}</p>
        {selectedTerm.caveat && <p className="ncc-caveat">{selectedTerm.caveat}</p>}
      </header>

      {isUnsupported ? (
        <div className="ncc-no-support" data-testid="status-no-support">
          <p className="ncc-empty-title">No support found in this document.</p>
          <p className="ncc-muted">
            No passage was cited for this term. The proposed meaning above is not backed by the text you provided
            and should be treated as unverified.
          </p>
        </div>
      ) : (
        <>
          {selectedTerm.evidence.length > 1 && (
            <div className="ncc-evidence-tabs" role="tablist" aria-label="Cited passages">
              {selectedTerm.evidence.map((evidenceItem, evidenceIndex) => {
                const evidenceSource = preparedDocument.sources.find((source) => source.id === evidenceItem.sourceId);
                return (
                  <button
                    key={evidenceItem.sourceId + evidenceIndex}
                    type="button"
                    role="tab"
                    aria-selected={evidenceIndex === selectedEvidenceIndex}
                    className="ncc-evidence-tab"
                    onClick={() => onSelectEvidence(evidenceIndex)}
                    data-testid={"button-evidence-" + evidenceIndex}
                  >
                    {evidenceSource ? evidenceSource.label + ", p." + evidenceSource.pageNumber : "Unmatched source"}
                  </button>
                );
              })}
            </div>
          )}

          {activeEvidence && activeEvidence.quote && (
            <blockquote className="ncc-cited-quote">
              <span className="ncc-eyebrow">Cited quote</span>
              {activeEvidence.quote}
            </blockquote>
          )}

          {activeEvidence && !activeSource && (
            <p className="ncc-quote-missing" role="note">
              This citation refers to a source that is not part of the prepared document, so it is not shown.
            </p>
          )}

          {activeSource && (
            <section className="ncc-source" data-testid="panel-source">
              <div className="ncc-source-head">
                <span className="ncc-source-label">{activeSource.label}</span>
                <span className="ncc-mono ncc-muted">
                  page {activeSource.pageNumber}
                  {activeSource.visual ? " / figure" : ""}
                </span>
              </div>
              {activeSource.visual ? (
                <p className="ncc-muted ncc-small">Visual observation on this supplied page. No textual definition is claimed; inspect the drawing and any legible figure labels.</p>
              ) : (
                <HighlightedPassage passageText={activeSource.text} quoteText={activeEvidence?.quote ?? ""} />
              )}
              {preparedDocument.inputType === "pdf" && (
                <div className="ncc-source-page">
                  <div className="ncc-row ncc-row-between">
                    <span className="ncc-eyebrow">Original page {activeSource.pageNumber}</span>
                    {pdfBlobUrl && (
                      <a
                        className="ncc-link"
                        href={pdfBlobUrl + "#page=" + activeSource.pageNumber}
                        target="_blank"
                        rel="noreferrer"
                        data-testid="link-open-original"
                      >
                        Open original PDF
                      </a>
                    )}
                  </div>
                  {loadedPdfDocument ? (
                    <PdfPageCanvas
                      loadedPdfDocument={loadedPdfDocument}
                      pageNumber={activeSource.pageNumber}
                      fallbackImageDataUrl={activePageImage}
                    />
                  ) : activePageImage ? (
                    <img className="ncc-page-image" src={activePageImage} alt={"Page " + activeSource.pageNumber} />
                  ) : null}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
