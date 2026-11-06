import { useMemo } from "react";
import "./claim-constructor.css";
import { AnalysisWorkspace } from "./components/AnalysisWorkspace";
import { CautionStrip } from "./components/CautionStrip";
import { ClaimSelector } from "./components/ClaimSelector";
import { ErrorNotice } from "./components/ErrorNotice";
import { IntakePanel } from "./components/IntakePanel";
import { ProgressPanel } from "./components/ProgressPanel";
import { SessionClock } from "./components/SessionClock";
import { LegalDisclaimer, SessionNotices } from "./components/SessionNotices";
import { useClaimSession } from "./session/use-claim-session";
import { useDocumentMetadata } from "./use-document-metadata";
import { getDocumentCautions } from "./cautions";
import { NuvoPatentsMark } from "./brand";

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
  const selectedInterpretation = selectedClaim ? sessionState.interpretationsByClaimNumber[selectedClaim.number] ?? null : null;
  const analyzedClaimNumbers = useMemo(
    () => new Set(Object.keys(sessionState.interpretationsByClaimNumber).map(Number)),
    [sessionState.interpretationsByClaimNumber],
  );

  return (
    <div className="ncc-root">
      <a className="ncc-skip" href="#ncc-main">Skip to content</a>
      <header className="ncc-topbar">
        <a className="ncc-brand" href={homeHref} data-testid="link-home">
          <NuvoPatentsMark size={28} className="ncc-brand-mark" />
          <span>NuvoPatents</span>
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
              <span className="ncc-eyebrow" data-testid="text-preview-label">Preview</span>
              <h1 className="ncc-display">Read a claim term with its source evidence.</h1>
              <p className="ncc-lede">
                Load a published patent. Pick a claim. Each proposed meaning is shown beside the exact passage or
                figure that supports it, and terms with no support are marked as unsupported.
              </p>
              <ol className="ncc-steps">
                <li><span className="ncc-step-number">1</span> Upload a PDF or paste the patent text</li>
                <li><span className="ncc-step-number">2</span> Choose one detected claim</li>
                <li><span className="ncc-step-number">3</span> Check each term against its source</li>
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
            <div className="ncc-doc-toolbar">
              <div className="ncc-doc-meta">
                <h1 className="ncc-doc-title" data-testid="text-document-title">{preparedDocument.title}</h1>
                <p className="ncc-doc-facts">
                  <span>{preparedDocument.inputType === "pdf" ? "PDF" : "Pasted text"}</span>
                  <span>{preparedDocument.pages.length} page{preparedDocument.pages.length === 1 ? "" : "s"}</span>
                  <span>{preparedDocument.sources.length} sources</span>
                  <span>{preparedDocument.claims.length} claims</span>
                </p>
              </div>
              <ClaimSelector
                claims={preparedDocument.claims}
                selectedClaimNumber={selectedClaimNumber}
                analyzedClaimNumbers={analyzedClaimNumbers}
                onSelectClaim={selectClaim}
              />
            </div>

            <CautionStrip label="Document cautions" messages={getDocumentCautions(preparedDocument)} testIdPrefix="cautions-document" />

            {selectedClaim ? (
              <AnalysisWorkspace
                key={selectedClaim.number}
                preparedDocument={preparedDocument}
                selectedClaim={selectedClaim}
                interpretation={selectedInterpretation}
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

            <SessionNotices compact />
          </div>
        )}

        <LegalDisclaimer analysisDisclaimer={selectedInterpretation?.disclaimer ?? null} />
      </main>
    </div>
  );
}

export default ClaimConstructor;
