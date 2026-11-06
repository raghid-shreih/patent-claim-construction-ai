/**
 * Documentation-only illustration using the real reader components.
 * This entry is NOT imported by the product or included in its Vite build.
 * It uses a fictional patent and authored example output, makes no API calls,
 * and cannot issue valid analysis receipts.
 */
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { ClaimDocument, ClaimInterpretation } from "../../src/core/contracts";
import { AnalysisWorkspace } from "../../src/ui/components/AnalysisWorkspace";
import { ClaimSelector } from "../../src/ui/components/ClaimSelector";
import { LegalDisclaimer } from "../../src/ui/components/SessionNotices";
import { NuvoPatentsMark } from "../../src/ui/brand";
import exampleDocument from "./example-document.json";
import type { EvidenceSelection } from "../../src/ui/session/session-state";
import "../../src/ui/claim-constructor.css";

// Generated offline by create-example-document.ts; no Node/server imports in the browser.
const illustrativeDocument = exampleDocument as ClaimDocument;
const moistureDefinitionSource = illustrativeDocument.sources.find(source => source.text.includes('term "moisture gate"'));
const biodegradableDefinitionSource = illustrativeDocument.sources.find(source => source.text.includes('"biodegradable" refers'));
if (!moistureDefinitionSource || !biodegradableDefinitionSource) throw new Error("The fictional definitions are missing.");

const illustrativeInterpretation: ClaimInterpretation = {
  claimNumber: 1,
  inheritedClaims: [],
  summary: "A seed sits inside a biodegradable capsule. A moisture-sensitive plug in the shell admits water after absorbing enough moisture. The specification gives particular meanings to both the plug and the biodegradable material.",
  terms: [
    {
      term: "moisture gate",
      meaning: "A plug that remains substantially impermeable until absorbed water reaches at least 30% of its dry mass, then swells and becomes permeable.",
      basis: "explicit",
      evidence: [{
        sourceId: moistureDefinitionSource.id,
        quote: 'As used herein, the term "moisture gate" means a plug that remains substantially impermeable to liquid water until it absorbs water equal to at least 30 percent of its dry mass, after which it swells and becomes permeable.',
      }],
      caveat: "The meaning is taken from this fictional specification, not from a general dictionary.",
    },
    {
      term: "biodegradable",
      meaning: "Material that loses at least half its mass within 180 days in moist soil at 20°C.",
      basis: "explicit",
      evidence: [{
        sourceId: biodegradableDefinitionSource.id,
        quote: 'As used herein, "biodegradable" refers to a material that loses at least half of its mass within 180 days when buried in moist soil at 20 degrees Celsius.',
      }],
      caveat: "",
    },
  ],
  warnings: [],
  disclaimer: "Illustrative research output, not legal advice. Verify the patent and cited passages.",
};

function DocumentationWalkthrough() {
  const [evidenceSelection, setEvidenceSelection] = useState<EvidenceSelection | null>(null);
  const inspectOnLoad = new URLSearchParams(window.location.search).get("view") === "evidence";

  useEffect(() => {
    if (inspectOnLoad) {
      // Open the same control a reader would click; no product test bypass exists.
      document.querySelector<HTMLButtonElement>(".ncc-inspect-toggle")?.click();
    }
  }, [inspectOnLoad]);

  return (
    <div className="ncc-root">
      <header className="ncc-topbar">
        <span className="ncc-brand"><NuvoPatentsMark /><span>NuvoPatents</span><span className="ncc-brand-sep">/</span><span className="ncc-brand-product">Claim Constructor</span></span>
        <span className="ncc-muted ncc-small">Documentation walkthrough</span>
      </header>
      <main className="ncc-main" style={{ maxWidth: 1100 }}>
        <p style={{ padding: "10px 14px", marginBottom: 20, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: 13, color: "#1e40af" }}>
          Illustrative example · Fictional patent · Authored demonstration output, not a live AI response
        </p>
        <div className="ncc-doc-toolbar" style={{ marginBottom: 24 }}>
          <div className="ncc-doc-meta">
            <h1 className="ncc-doc-title">Self-sealing seed capsule</h1>
            <p className="ncc-doc-facts"><span>Fictional teaching sample</span><span>5 claims</span></p>
          </div>
          <ClaimSelector claims={illustrativeDocument.claims} selectedClaimNumber={1} analyzedClaimNumbers={new Set([1])} onSelectClaim={() => {}} />
        </div>
        <AnalysisWorkspace
          preparedDocument={illustrativeDocument}
          selectedClaim={illustrativeDocument.claims[0]}
          interpretation={illustrativeInterpretation}
          isAnalyzing={false}
          analysisError={null}
          evidenceSelection={evidenceSelection}
          loadedPdfDocument={null}
          pdfBlobUrl={null}
          onAnalyze={() => {}}
          onSelectEvidence={(termIndex, evidenceIndex = 0) => setEvidenceSelection({ termIndex, evidenceIndex })}
          onStartOver={() => {}}
        />
        <LegalDisclaimer analysisDisclaimer={illustrativeInterpretation.disclaimer} />
      </main>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("The documentation preview requires a root element.");
createRoot(rootElement).render(<DocumentationWalkthrough />);
