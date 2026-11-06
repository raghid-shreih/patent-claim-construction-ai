export function SessionNotices({ compact }: { compact?: boolean }) {
  return (
    <aside className={"ncc-notices" + (compact ? " ncc-notices-compact" : "")} aria-label="Privacy and session">
      <p>
        <strong>Public documents only.</strong> Do not upload confidential or unpublished patent material.
        AI processing for this demo is billed to the Nuvopatents project.
      </p>
      <p>
        <strong>Local session.</strong> Your document and results stay in this page for up to 30 minutes, or until you
        clear the session or reload. The server processes the content to answer but does not retain it. The AI
        provider's own data policies still apply.
      </p>
    </aside>
  );
}

export function QuotaNotice() {
  return (
    <p className="ncc-hint">
      Finding claims and construing a claim each count toward a shared daily request limit for this demo.
    </p>
  );
}

/** The single legal and human-review disclaimer box shown at the bottom of the tool. */
export function LegalDisclaimer({ analysisDisclaimer }: { analysisDisclaimer?: string | null }) {
  return (
    <aside className="ncc-legal" aria-labelledby="ncc-legal-heading" data-testid="section-legal-disclaimer">
      <h2 id="ncc-legal-heading" className="ncc-legal-title">Legal notice and human review</h2>
      <p>
        <strong>Not legal advice.</strong> This is a reading aid. It does not consider prosecution history, case law,
        or claim scope, and it can be wrong. Have a qualified person review every proposed meaning against the
        cited source before relying on it.
      </p>
      {analysisDisclaimer && <p data-testid="text-analysis-disclaimer">{analysisDisclaimer}</p>}
    </aside>
  );
}
