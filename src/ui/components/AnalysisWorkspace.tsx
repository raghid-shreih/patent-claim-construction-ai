import { useEffect, useRef } from "react";
import type { ClaimDocument, ClaimInterpretation, DetectedClaim } from "../contract-types";
import type { LoadedPdfDocument } from "../pdf/pdf-runtime";
import type { EvidenceSelection, RecoverableError } from "../session/session-state";
import { ClaimTextWithTerms } from "./ClaimTextWithTerms";
import { ErrorNotice } from "./ErrorNotice";
import { EvidencePanel } from "./EvidencePanel";
import { TermIndex } from "./TermIndex";

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
  const evidenceColumnRef = useRef<HTMLDivElement | null>(null);
  const selectedTermIndex = evidenceSelection?.termIndex ?? null;
  const selectedTerm = interpretation && selectedTermIndex !== null ? interpretation.terms[selectedTermIndex] ?? null : null;

  function selectTermAndReveal(termIndex: number) {
    onSelectEvidence(termIndex, 0);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => evidenceColumnRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

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
          <span className="ncc-eyebrow">
            {selectedClaim.dependsOn.length === 0
              ? "Independent claim"
              : "Dependent on claim " + selectedClaim.dependsOn.join(", ")}
          </span>
          <h2 className="ncc-claim-title" tabIndex={-1} ref={headingRef}>
            Claim {selectedClaim.number}
          </h2>
        </header>

        {interpretation ? (
          <ClaimTextWithTerms
            claimText={selectedClaim.text}
            terms={interpretation.terms}
            selectedTermIndex={selectedTermIndex}
            onSelectTerm={selectTermAndReveal}
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
            <section className="ncc-summary" aria-label="Plain English summary">
              <span className="ncc-eyebrow">In plain English</span>
              <p className="ncc-summary-text" data-testid="text-summary">{interpretation.summary}</p>
              <p className="ncc-inheritance">{describeInheritance(interpretation.inheritedClaims)}</p>
              {inheritedClaimTexts.length > 0 && (
                <details className="ncc-inherited">
                  <summary>Show inherited claim text</summary>
                  {inheritedClaimTexts.map((inheritedClaim) => (
                    <p key={inheritedClaim.number}>
                      <span className="ncc-mono">{inheritedClaim.number}.</span> {inheritedClaim.text}
                    </p>
                  ))}
                </details>
              )}
            </section>

            {interpretation.warnings.length > 0 && (
              <ul className="ncc-warnings" aria-label="Analysis warnings">
                {interpretation.warnings.map((warningText) => (
                  <li key={warningText}>{warningText}</li>
                ))}
              </ul>
            )}

            <section aria-label="Terms">
              <div className="ncc-row ncc-row-between ncc-section-head">
                <span className="ncc-eyebrow">Terms, {interpretation.terms.length}</span>
                <button type="button" className="ncc-link-button" onClick={onAnalyze} data-testid="button-reanalyze">
                  Run again
                </button>
              </div>
              <TermIndex terms={interpretation.terms} selectedTermIndex={selectedTermIndex} onSelectTerm={selectTermAndReveal} />
            </section>

            <p className="ncc-disclaimer">{interpretation.disclaimer}</p>
          </>
        )}
      </div>

      <div className="ncc-evidence-column" ref={evidenceColumnRef}>
        {interpretation ? (
          <EvidencePanel
            preparedDocument={preparedDocument}
            selectedTerm={selectedTerm}
            selectedEvidenceIndex={evidenceSelection?.evidenceIndex ?? 0}
            loadedPdfDocument={loadedPdfDocument}
            pdfBlobUrl={pdfBlobUrl}
            onSelectEvidence={(evidenceIndex) => {
              if (selectedTermIndex !== null) onSelectEvidence(selectedTermIndex, evidenceIndex);
            }}
          />
        ) : (
          <div className="ncc-evidence-empty">
            <p className="ncc-empty-title">Evidence appears here.</p>
            <p className="ncc-muted">
              After construing, select any term, in the list or in the claim text, to see the exact passage and page
              behind its proposed meaning.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
