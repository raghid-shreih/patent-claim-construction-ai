import { useEffect, useRef, useState } from "react";
import type { ClaimDocument, ClaimInterpretation, DetectedClaim } from "../contract-types";
import type { LoadedPdfDocument } from "../pdf/pdf-runtime";
import type { EvidenceSelection, RecoverableError } from "../session/session-state";
import { CautionStrip } from "./CautionStrip";
import { ClaimTextWithTerms } from "./ClaimTextWithTerms";
import { ErrorNotice } from "./ErrorNotice";
import { EvidencePanel } from "./EvidencePanel";
import { TermIndex } from "./TermIndex";
import { getAnalysisCautions, getDocumentCautions } from "../cautions";

interface AnalysisWorkspaceProps {
  preparedDocument: ClaimDocument;
  selectedClaim: DetectedClaim;
  interpretation: ClaimInterpretation | null;
  isAnalyzing: boolean;
  analysisError: RecoverableError | null;
  evidenceSelection: EvidenceSelection | null;
  loadedPdfDocument: LoadedPdfDocument | null;
  pdfBlobUrl: string | null;
  onAnalyze: () => void;
  onSelectEvidence: (termIndex: number, evidenceIndex?: number) => void;
  onStartOver: () => void;
}

function describeInheritance(inheritedClaims: number[]): string {
  if (inheritedClaims.length === 0) return "Read on its own: this claim does not inherit limitations.";
  return "Read together with " + inheritedClaims.map((claimNumber) => "claim " + claimNumber).join(", then ") +
    ", whose limitations this claim includes.";
}

/**
 * Inline reading workspace. The parent keys this component by claim number, so the
 * promoted (selected-first) term ordering resets whenever the claim changes.
 */
export function AnalysisWorkspace({
  preparedDocument,
  selectedClaim,
  interpretation,
  isAnalyzing,
  analysisError,
  evidenceSelection,
  loadedPdfDocument,
  pdfBlobUrl,
  onAnalyze,
  onSelectEvidence,
  onStartOver,
}: AnalysisWorkspaceProps) {
  const selectedTermIndex = evidenceSelection?.termIndex ?? null;
  const [expandedTermIndex, setExpandedTermIndex] = useState<number | null>(null);
  const [promotedTermIndex, setPromotedTermIndex] = useState<number | null>(null);
  const effectivePromotedIndex =
    promotedTermIndex !== null && interpretation && promotedTermIndex < interpretation.terms.length ? promotedTermIndex : null;

  function selectTerm(termIndex: number) {
    setPromotedTermIndex(termIndex);
    setExpandedTermIndex(termIndex);
    onSelectEvidence(termIndex, selectedTermIndex === termIndex ? evidenceSelection?.evidenceIndex ?? 0 : 0);
  }

  function toggleInspection(termIndex: number) {
    if (expandedTermIndex === termIndex) setExpandedTermIndex(null);
    else selectTerm(termIndex);
  }

  useEffect(() => {
    setExpandedTermIndex(null);
    setPromotedTermIndex(null);
  }, [interpretation]);

  const inheritedClaimTexts = (interpretation?.inheritedClaims ?? [])
    .map((claimNumber) => preparedDocument.claims.find((claim) => claim.number === claimNumber))
    .filter((claim): claim is DetectedClaim => claim !== undefined);

  const headingRef = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [selectedClaim.number]);

  return (
    <div className="ncc-workspace">
      <div className="ncc-reading-column">
        <header className="ncc-claim-header">
          <h2 className="ncc-claim-title" tabIndex={-1} ref={headingRef}>Claim {selectedClaim.number}</h2>
          <span className="ncc-claim-kind">
            {selectedClaim.dependsOn.length === 0
              ? "Independent claim"
              : "Dependent on claim " + selectedClaim.dependsOn.join(", ")}
          </span>
        </header>

        {interpretation ? (
          <ClaimTextWithTerms
            claimText={selectedClaim.text}
            terms={interpretation.terms}
            selectedTermIndex={selectedTermIndex}
            onSelectTerm={selectTerm}
          />
        ) : (
          <p className="ncc-claim-fulltext">{selectedClaim.text}</p>
        )}

        {!interpretation && !isAnalyzing && (
          <div className="ncc-analyze-call">
            <button type="button" className="ncc-button ncc-button-primary" onClick={onAnalyze} data-testid="button-analyze">
              Construe claim {selectedClaim.number}
            </button>
            <span className="ncc-muted ncc-small">
              Identifies key terms and traces each proposed meaning to passages in this document.
            </span>
          </div>
        )}

        {isAnalyzing && (
          <div className="ncc-analyzing" role="status" aria-live="polite" data-testid="status-analyzing">
            <div className="ncc-progress-track ncc-progress-indeterminate">
              <div className="ncc-progress-fill" />
            </div>
            <p>
              Reading claim {selectedClaim.number}
              {selectedClaim.dependsOn.length > 0 ? " with its parent claims" : ""} against{" "}
              {preparedDocument.sources.length} source passages. This usually takes 10 to 40 seconds.
            </p>
            <div className="ncc-skeleton-lines" aria-hidden="true">
              <span /><span /><span />
            </div>
          </div>
        )}

        {analysisError && <ErrorNotice error={analysisError} onRetry={onAnalyze} onStartOver={onStartOver} />}

        {interpretation && (
          <>
            <section aria-labelledby="ncc-terms-heading" className="ncc-terms-section">
              <div className="ncc-section-head">
                <h3 id="ncc-terms-heading" className="ncc-section-title">
                  Terms <span className="ncc-count">{interpretation.terms.length}</span>
                </h3>
                <button type="button" className="ncc-link-button" onClick={onAnalyze} data-testid="button-reanalyze">
                  Run again
                </button>
              </div>
              <TermIndex
                terms={interpretation.terms}
                selectedTermIndex={selectedTermIndex}
                promotedTermIndex={effectivePromotedIndex}
                expandedTermIndex={expandedTermIndex}
                onToggleInspection={toggleInspection}
                renderInspection={(termIndex) => (
                  <EvidencePanel
                    preparedDocument={preparedDocument}
                    selectedTerm={interpretation.terms[termIndex]}
                    selectedEvidenceIndex={evidenceSelection?.termIndex === termIndex ? evidenceSelection.evidenceIndex : 0}
                    loadedPdfDocument={loadedPdfDocument}
                    pdfBlobUrl={pdfBlobUrl}
                    onSelectEvidence={(evidenceIndex) => onSelectEvidence(termIndex, evidenceIndex)}
                  />
                )}
              />
            </section>

            <details className="ncc-summary" open data-testid="section-summary">
              <summary className="ncc-summary-toggle">In plain English</summary>
              <div className="ncc-summary-body">
                <p className="ncc-summary-text" data-testid="text-summary">{interpretation.summary}</p>
                <p className="ncc-inheritance">{describeInheritance(interpretation.inheritedClaims)}</p>
                {inheritedClaimTexts.length > 0 && (
                  <details className="ncc-inherited">
                    <summary>Show inherited claim text</summary>
                    {inheritedClaimTexts.map((inheritedClaim) => (
                      <p key={inheritedClaim.number}>
                        <strong>{inheritedClaim.number}.</strong> {inheritedClaim.text}
                      </p>
                    ))}
                  </details>
                )}
              </div>
            </details>
            <CautionStrip
              label="Analysis cautions"
              messages={getAnalysisCautions(interpretation.warnings, getDocumentCautions(preparedDocument))}
              testIdPrefix="cautions-analysis"
            />
          </>
        )}
      </div>

    </div>
  );
}
