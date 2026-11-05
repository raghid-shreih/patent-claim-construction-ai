import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSources, detectClaims, resolveInheritedClaims, signDocument, verifyDocument,
} from "../src/core/document";
import { documentInputSchema, type DocumentInput } from "../src/core/contracts";
import { validateEvidence } from "../src/core/evidence";

const secret = "unit-test-signing-secret-not-a-real-credential";
export const sampleInput: DocumentInput = {
  title: "Fictional educational sample", inputType: "text",
  pages: [{ pageNumber: 1, text: `DESCRIPTION

[0001] A coupling is a detachable connector between the housing and the sensor.

[0002] The housing surrounds the sensor.

CLAIMS
1. An apparatus comprising a housing, a sensor, and a coupling connecting the housing to the sensor.
2. The apparatus of claim 1, wherein the coupling is detachable.
3. The apparatus of claim 2, wherein the housing is rigid.
4. The apparatus of any one of claims 1 to 3, further comprising a switch.` }],
};

test("claims are parsed only after the claims heading, preserving dependencies", () => {
  const claims = detectClaims(sampleInput.pages);
  assert.deepEqual(claims.map(claim => claim.number), [1, 2, 3, 4]);
  assert.deepEqual(claims[3].dependsOn, [1, 2, 3]);
  assert.deepEqual(resolveInheritedClaims(claims, 3).map(claim => claim.number), [1, 2]);
  assert.match(claims[0].text, /coupling/);
  assert.equal(claims[0].text.includes("[0001]"), false);
});

test("missing claims headings do not turn paragraph numbers into claims", () => {
  assert.throws(() => detectClaims([{ pageNumber: 1, text: "DESCRIPTION\n1. A numbered description paragraph" }]), /No Claims heading/);
});

test("claim dependency failures are explicit", () => {
  assert.throws(() => resolveInheritedClaims([{ number: 2, text: "2. The apparatus of claim 1.", dependsOn: [1] }], 2), /missing/);
  assert.throws(() => resolveInheritedClaims([
    { number: 1, text: "a", dependsOn: [2] }, { number: 2, text: "b", dependsOn: [1] },
  ], 1), /Circular/);
});

test("duplicate claim numbering is rejected", () => {
  assert.throws(() => detectClaims([{ pageNumber: 1, text: "CLAIMS\n1. One apparatus.\n1. Another apparatus." }]), /ambiguous/);
});

test("signed document receipts survive JSON transfer but reject changes and expiry", () => {
  const document = signDocument(sampleInput, secret, [], 1_000_000);
  const transferred = JSON.parse(JSON.stringify(document));
  verifyDocument(transferred, secret, 1_000_001);
  assert.throws(() => verifyDocument({ ...transferred, title: "tampered" }, secret, 1_000_001), /verification/);
  assert.throws(() => verifyDocument(transferred, secret, 1_000_000 + 30 * 60_000), /expired/);
  assert.throws(() => verifyDocument(transferred, "other signing key", 1_000_001), /verification/);
});

test("source identifiers preserve real paragraph labels and page numbers", () => {
  const sources = buildSources(sampleInput);
  const definition = sources.find(source => source.text.includes("detachable connector"))!;
  assert.equal(definition.pageNumber, 1);
  assert.match(definition.label, /\[0001\]/);
  assert.equal(definition.visual, false);
});

test("unmatched quotes, invented sources, and invented terms do not appear as verified evidence", () => {
  const document = signDocument(sampleInput, secret, []);
  const definition = document.sources.find(source => source.text.includes("detachable connector"))!;
  const result = validateEvidence({
    summary: "An apparatus with a sensor in a housing.",
    terms: [
      { term: "coupling", meaning: "A detachable connector.", basis: "explicit", evidence: [{ sourceId: definition.id, quote: "A coupling is a detachable connector" }], caveat: "" },
      { term: "housing", meaning: "An invented definition.", basis: "explicit", evidence: [{ sourceId: definition.id, quote: "A housing is a blue box" }], caveat: "" },
      { term: "sensor", meaning: "Invented support.", basis: "contextual", evidence: [{ sourceId: "fake-id", quote: "A sensor records electricity" }], caveat: "" },
      { term: "spaceship", meaning: "Not in the claim.", basis: "explicit", evidence: [], caveat: "" },
    ], warnings: [],
  }, document, document.claims[0], []);
  assert.equal(result.terms.length, 3);
  assert.equal(result.terms[0].evidence.length, 1);
  assert.equal(result.terms[1].basis, "unsupported");
  assert.match(result.terms[1].meaning, /No verified/);
  assert.equal(result.terms[2].evidence.length, 0);
});

test("visual references require an actual image source and cannot manufacture quotations", () => {
  const document = signDocument(sampleInput, secret, []);
  document.sources.push({ id: "page-1-image", pageNumber: 1, text: "", visual: true, label: "Original page 1" });
  const result = validateEvidence({
    summary: "A housing is shown.",
    terms: [{ term: "housing", meaning: "A surrounding structure.", basis: "visual", evidence: [{ sourceId: "page-1-image", quote: "" }], caveat: "Page-level observation, no legible figure identifier." }],
    warnings: [],
  }, document, document.claims[0], []);
  assert.equal(result.terms[0].basis, "visual");
  assert.equal(result.terms[0].evidence[0].quote, "");
});

test("document size and source type checks reject rather than truncate", () => {
  assert.equal(documentInputSchema.safeParse(sampleInput).success, true);
  assert.equal(documentInputSchema.safeParse({ ...sampleInput, pages: [{ pageNumber: 2, text: "bad sequence" }] }).success, false);
  assert.equal(documentInputSchema.safeParse({ ...sampleInput, inputType: "pdf" }).success, false);
  assert.equal(documentInputSchema.safeParse({ ...sampleInput, pages: [{ pageNumber: 1, text: "x".repeat(20_001) }] }).success, false);
});
