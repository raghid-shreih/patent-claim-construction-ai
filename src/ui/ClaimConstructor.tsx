import { useMemo } from "react";
import "./claim-constructor.css";
import { AnalysisWorkspace } from "./components/AnalysisWorkspace";
import { ClaimList } from "./components/ClaimList";
import { ErrorNotice } from "./components/ErrorNotice";
import { IntakePanel } from "./components/IntakePanel";
import { ProgressPanel } from "./components/ProgressPanel";
import { SessionClock } from "./components/SessionClock";
import { SessionNotices } from "./components/SessionNotices";
import { useClaimSession } from "./session/use-claim-session";
import { useDocumentMetadata } from "./use-document-metadata";

export interface ClaimConstructorProps {
  apiBase?: string;
  homeHref?: string;
}

export function ClaimConstructor({ apiBase = "/api/claim-constructor", homeHref = "/" }: ClaimConstructorProps) {
  useDocumentMetadata(
    "Claim Constructor | Nuvopatents",
    "Inspect why a patent claim term may carry a proposed meaning, with every reading traced to the passage or figure that supports it.",
  );

  const {
    sessionState,
    loadedPdfDocument,
    pdfBlobUrl,
    loadPdfFile,
    loadPastedText,
    retryPreparation,
    cancelInProgressWork,
    clearSession,
    selectClaim,
    analyzeClaim,
    selectEvidence,
    dismissNotice,
  } = useClaimSession(apiBase);

  const { preparedDocument, selectedClaimNumber, workflowPhase } = sessionState;
  const selectedClaim = preparedDocument?.claims.find((claim) => claim.number === selectedClaimNumber) ?? null;
  const analyzedClaimNumbers = useMemo(
    () => new Set(Object.keys(sessionState.interpretationsByClaimNumber).map(Number)),
    [sessionState.interpretationsByClaimNumber],
  );

  return (
    <div className="ncc-root">
      <a className="ncc-skip" href="#ncc-main">Skip to content</a>
      <header className="ncc-topbar">
        <a className="ncc-brand" href={homeHref} data-testid="link-home">
          <span className="ncc-brand-mark" aria-hidden="true">N</span>
          <span>Nuvopatents</span>
          <span className="ncc-brand-sep" aria-hidden="true">/</span>
          <span className="ncc-brand-product">Claim Constructor</span>
        </a>
        <div className="ncc-topbar-actions">
          {sessionState.sessionExpiresAtMilliseconds !== null && (
            <SessionClock expiresAtMilliseconds={sessionState.sessionExpiresAtMilliseconds} />
          )}
          {(preparedDocument || workflowPhase !== "intake") && (
            <button type="button" className="ncc-button ncc-button-danger" onClick={() => clearSession(null)} data-testid="button-clear-session">
              Clear session
            </button>
          )}
        </div>
      </header>

      <main id="ncc-main" className="ncc-main">
        {sessionState.sessionEndedNotice && (
          <div className="ncc-ended" role="status">
            <p>{sessionState.sessionEndedNotice}</p>
            <button type="button" className="ncc-link-button" onClick={dismissNotice}>Dismiss</button>
          </div>
        )}

        {!preparedDocument && (
          <div className="ncc-intro-grid">
            <section className="ncc-intro">
              <span className="ncc-eyebrow">Public research preview</span>
              <h1 className="ncc-display">
                Read a claim term <em>with its receipts.</em>
              </h1>
              <p className="ncc-lede">
                Load a published patent. Pick a claim. Each proposed meaning is shown beside the exact passage or
                figure that supports it, and terms with no support are marked as unsupported.
              </p>
              <ol className="ncc-steps">
                <li><span className="ncc-mono">01</span> Load a PDF or paste text</li>
                <li><span className="ncc-mono">02</span> Choose one detected claim</li>
                <li><span className="ncc-mono">03</span> Inspect each term against its source</li>
              </ol>
              <SessionNotices />
            </section>

            <section className="ncc-intake-card" aria-label="Load a document">
              {workflowPhase === "intake" && (
                <>
                  {sessionState.intakeError && (
                    <ErrorNotice error={sessionState.intakeError} onRetry={retryPreparation} onStartOver={() => clearSession(null)} />
                  )}
                  <IntakePanel
                    onSubmitPdf={(pdfFile, documentTitle) => void loadPdfFile(pdfFile, documentTitle)}
                    onSubmitText={(pastedText, documentTitle) => void loadPastedText(pastedText, documentTitle)}
                  />
                </>
              )}
              {(workflowPhase === "extracting" || workflowPhase === "preparing") && sessionState.progress && (
                <ProgressPanel
                  progress={sessionState.progress}
                  isIndeterminate={workflowPhase === "preparing"}
                  onCancel={cancelInProgressWork}
                />
              )}
            </section>
          </div>
        )}

        {preparedDocument && (
          <div className="ncc-desk">
            <aside className="ncc-claims-rail" aria-label="Claims">
              <div className="ncc-doc-meta">
                <span className="ncc-eyebrow">{preparedDocument.inputType === "pdf" ? "PDF" : "Pasted text"}</span>
                <h1 className="ncc-doc-title" data-testid="text-document-title">{preparedDocument.title}</h1>
                <p className="ncc-mono ncc-muted ncc-small">
                  {preparedDocument.pages.length} page{preparedDocument.pages.length === 1 ? "" : "s"} /{" "}
                  {preparedDocument.sources.length} sources / {preparedDocument.claims.length} claims
                </p>
              </div>
              {preparedDocument.warnings.length > 0 && (
                <ul className="ncc-warnings" aria-label="Document warnings">
                  {preparedDocument.warnings.map((warningText) => <li key={warningText}>{warningText}</li>)}
                </ul>
              )}
              {preparedDocument.inputType === "text" && (
                <p className="ncc-hint ncc-hint-warn">Pasted text has no drawings, so figure-based support is unavailable.</p>
              )}
              <ClaimList
                claims={preparedDocument.claims}
                selectedClaimNumber={selectedClaimNumber}
                analyzedClaimNumbers={analyzedClaimNumbers}
                onSelectClaim={selectClaim}
              />
              <SessionNotices compact />
            </aside>

            {selectedClaim ? (
              <AnalysisWorkspace
                key={selectedClaim.number}
                preparedDocument={preparedDocument}
                selectedClaim={selectedClaim}
                interpretation={sessionState.interpretationsByClaimNumber[selectedClaim.number] ?? null}
                isAnalyzing={sessionState.analyzingClaimNumber === selectedClaim.number}
                analysisError={sessionState.analysisError}
                evidenceSelection={sessionState.evidenceSelection}
                loadedPdfDocument={loadedPdfDocument}
                pdfBlobUrl={pdfBlobUrl}
                onAnalyze={() => void analyzeClaim(selectedClaim.number)}
                onSelectEvidence={selectEvidence}
                onStartOver={() => clearSession(null)}
              />
            ) : (
              <div className="ncc-evidence-empty">
                <p className="ncc-empty-title">Select a claim to begin.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default ClaimConstructor;
