import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ClaimSelector } from "../src/ui/components/ClaimSelector";
import { TermIndex } from "../src/ui/components/TermIndex";
import { CautionStrip } from "../src/ui/components/CautionStrip";
import { LegalDisclaimer, SessionNotices } from "../src/ui/components/SessionNotices";
import type { ClaimTermInterpretation } from "../src/ui/contract-types";
import { AnalysisWorkspace } from "../src/ui/components/AnalysisWorkspace";
import { readingDocument, readingInterpretation } from "./fixtures/reading-workspace";
import { EvidencePanel } from "../src/ui/components/EvidencePanel";
import { getDocumentCautions, getAnalysisCautions, uniqueCautions, TEXT_ONLY_CAUTION } from "../src/ui/cautions";

const terms: ClaimTermInterpretation[] = [
  { term: "housing", meaning: "A surrounding structure.", basis: "contextual", evidence: [], caveat: "" },
  {
    term: "coupling", meaning: "A detachable connector.", basis: "explicit",
    evidence: [{ sourceId: "description-1", quote: "A coupling is a detachable connector." }], caveat: "",
  },
];

test("rendered promoted term keeps its original evidence identifier and accessible selection", () => {
  const markup = renderToStaticMarkup(createElement(TermIndex, {
    terms, selectedTermIndex: 1, promotedTermIndex: 1,
    expandedTermIndex: 1, onToggleInspection: () => {}, renderInspection: () => createElement("p", {}, "Evidence belongs here"),
  }));
  assert.ok(markup.indexOf('data-testid="button-term-1"') < markup.indexOf('data-testid="button-term-0"'));
  assert.match(markup, /aria-expanded="true"/);
  assert.match(markup, /aria-label="Collapse coupling"/);
  assert.match(markup, /Evidence belongs here/);
  assert.doesNotMatch(markup, /View evidence for this term/);
  assert.match(markup, /1 cited passage/);
  assert.equal(terms[0].term, "housing");
});

test("claim selector shows dependency and analyzed status without a persistent claim rail", () => {
  const markup = renderToStaticMarkup(createElement(ClaimSelector, {
    claims: [
      { number: 1, text: "A housing.", dependsOn: [] },
      { number: 12, text: "The housing of claim 1.", dependsOn: [1] },
    ],
    selectedClaimNumber: 12, analyzedClaimNumbers: new Set([12]), onSelectClaim: () => {},
  }));
  assert.match(markup, /Claim 12/);
  assert.match(markup, /Depends on claim 1/);
  assert.match(markup, /Analyzed/);
  assert.match(markup, /Previous claim, claim 1/);
  assert.match(markup, /aria-expanded="false"/);
  assert.doesNotMatch(markup, /ncc-claims-rail/);
});

test("every caution remains available in a labeled button rather than disappearing", () => {
  const messages = ["Ambiguous connector material.", "No figure support is available."];
  const markup = renderToStaticMarkup(createElement(CautionStrip, {
    label: "Analysis cautions", messages, testIdPrefix: "test-cautions",
  }));
  for (const message of messages) assert.ok(markup.includes(message));
  assert.match(markup, /Show all/);
  assert.match(markup, /aria-controls=/);
  assert.match(markup, /Scroll analysis cautions right/);
});

test("legal and human review language occupies one separate notice, not the privacy notice", () => {
  const legalMarkup = renderToStaticMarkup(createElement(LegalDisclaimer, {
    analysisDisclaimer: "Quotations are machine-checked; interpretation needs human review.",
  }));
  const privacyMarkup = renderToStaticMarkup(createElement(SessionNotices, {}));
  assert.match(legalMarkup, /Legal notice and human review/);
  assert.equal((legalMarkup.match(/<aside/g) ?? []).length, 1);
  assert.match(legalMarkup, /machine-checked/);
  assert.doesNotMatch(privacyMarkup, /legal advice/);
  assert.match(privacyMarkup, /Public documents only/);
  assert.match(privacyMarkup, /30 minutes/);
});

test("loaded results start compact, place terms before summary, and do not render a duplicate evidence column", () => {
  const markup = renderToStaticMarkup(createElement(AnalysisWorkspace, {
    preparedDocument: readingDocument, selectedClaim: readingDocument.claims[0],
    interpretation: readingInterpretation, isAnalyzing: false, analysisError: null,
    evidenceSelection: { termIndex: 0, evidenceIndex: 0 },
    loadedPdfDocument: null, pdfBlobUrl: null,
    onAnalyze: () => {}, onSelectEvidence: () => {}, onStartOver: () => {},
  }));
  assert.ok(markup.indexOf('aria-label="Construed terms"') < markup.indexOf('data-testid="section-summary"'));
  assert.match(markup, /<details class="ncc-summary" open=""/);
  assert.doesNotMatch(markup, /ncc-evidence-column|Term under inspection/);
  assert.match(markup, /aria-label="Inspect coupling"/);
  assert.doesNotMatch(markup, /data-testid="panel-source"/);
  assert.doesNotMatch(markup, /Not legal advice/);
  assert.match(markup, /ncc-basis-unsupported/);
});

test("expanded inspection preserves source evidence inside a card without duplicating its overview", () => {
  const markup = renderToStaticMarkup(createElement(TermIndex, {
    terms: readingInterpretation.terms, selectedTermIndex: 0, promotedTermIndex: 0, expandedTermIndex: 0,
    onToggleInspection: () => {},
    renderInspection: (termIndex) => createElement(EvidencePanel, {
      preparedDocument: readingDocument, selectedTerm: readingInterpretation.terms[termIndex],
      selectedEvidenceIndex: 0, loadedPdfDocument: null, pdfBlobUrl: null, onSelectEvidence: () => {},
    }),
  }));
  assert.match(markup, /Description \[0001\]/);
  assert.match(markup, /A coupling is a detachable connector/);
  assert.equal((markup.match(/A detachable connector joining the housing to the sensor\./g) ?? []).length, 1);
  assert.equal((markup.match(/class="ncc-evidence"/g) ?? []).length, 1);
  assert.doesNotMatch(markup, /Term under inspection/);
  assert.match(markup, /<mark class="ncc-quote-mark">/);
});

test("document cautions consolidate legacy wording and do not repeat in analysis cautions", () => {
  const documentCautions = getDocumentCautions({
    inputType: "text",
    warnings: ["Pasted text has no drawings, so figure-based support is unavailable.", TEXT_ONLY_CAUTION],
  });
  assert.equal(documentCautions.length, 1);
  assert.deepEqual(getAnalysisCautions([
    TEXT_ONLY_CAUTION,
    "The connector material is unspecified.",
    "  The connector material is unspecified. ",
  ], documentCautions), ["The connector material is unspecified."]);
  assert.deepEqual(getDocumentCautions({ inputType: "pdf", warnings: [] }), []);
  assert.deepEqual(uniqueCautions(["", " ", "A specific ambiguity.", "a specific ambiguity."]), ["A specific ambiguity."]);
});
