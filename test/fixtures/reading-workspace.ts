import type { ClaimDocument, ClaimInterpretation } from "../../src/core/contracts";

/** Fictional, local-only data for rendering the real workspace without an AI request. */
export const readingDocument: ClaimDocument = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Detachable sensor assembly — fictional sample",
  inputType: "text",
  pages: [{ pageNumber: 1, text: "A coupling is a detachable connector between the housing and the sensor." }],
  sources: [{
    id: "description-1", pageNumber: 1, label: "Description [0001]", visual: false,
    text: "A coupling is a detachable connector between the housing and the sensor. The housing surrounds and protects the sensor.",
  }],
  claims: [
    { number: 1, text: "An apparatus comprising a housing, a sensor, and a coupling connecting the housing to the sensor.", dependsOn: [] },
    { number: 2, text: "The apparatus of claim 1, wherein the coupling is detachable.", dependsOn: [1] },
  ],
  warnings: [], receipt: "render-only-not-a-valid-receipt", expiresAt: "2099-01-01T00:00:00.000Z",
};

export const readingInterpretation: ClaimInterpretation = {
  claimNumber: 1, inheritedClaims: [],
  summary: "The claim describes a sensor inside a protective housing, with a detachable connector joining the two.",
  terms: [
    {
      term: "coupling", meaning: "A detachable connector joining the housing to the sensor.", basis: "explicit",
      evidence: [{ sourceId: "description-1", quote: "A coupling is a detachable connector" }], caveat: "",
    },
    {
      term: "housing", meaning: "A structure that surrounds and protects the sensor.", basis: "contextual",
      evidence: [{ sourceId: "description-1", quote: "The housing surrounds and protects the sensor." }],
      caveat: "No specific housing material is defined.",
    },
    {
      term: "sensor", meaning: "The patent does not identify a particular sensor technology.", basis: "unsupported",
      evidence: [], caveat: "No verified definition of the sensing technology was found.",
    },
  ],
  warnings: ["The sensor technology is not specified.", "Pasted text has no drawings, so figure-based support is unavailable."],
  disclaimer: "Not legal advice. Legal reasoning and visual observations require human review.",
};
