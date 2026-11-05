import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  DemoError, DOCUMENT_LIMITS,
  type ClaimDocument, type ClaimSource, type DetectedClaim, type DocumentInput,
} from "./contracts";

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Only parse the claims section: numbered description paragraphs are not claims. */
export function detectClaims(pages: DocumentInput["pages"]): DetectedClaim[] {
  const fullText = pages.map(page => page.text).join("\n\n");
  const heading = /(?:^|\n)\s*(?:claims|what is claimed is\s*:|we claim\s*:|i claim\s*:)\s*(?:\n|$)/ig;
  const headings = [...fullText.matchAll(heading)];
  // A running "Claims" header on later PDF pages must not discard earlier claims.
  const claimsHeading = headings.find(match =>
    /^\s*1[.)]\s+/m.test(fullText.slice(match.index! + match[0].length)),
  ) ?? headings[0];
  if (!claimsHeading || claimsHeading.index === undefined) {
    throw new DemoError(400, "No Claims heading found. Include the patent description and a separate Claims section with numbered claims.");
  }
  const claimsText = fullText.slice(claimsHeading.index + claimsHeading[0].length);
  const starts = [...claimsText.matchAll(/(?:^|\n)\s*(\d{1,3})[.)]\s+([^\n]+)/g)];
  if (!starts.length) {
    throw new DemoError(400, "No numbered claims found after the Claims heading. Check extracted text or paste the description and numbered claims.");
  }
  if (starts.length > 100) throw new DemoError(400, "This demo supports up to 100 claims.");
  const seenNumbers = new Set<number>();
  return starts.map((match, index) => {
    const number = Number(match[1]);
    if (!number || seenNumbers.has(number)) throw new DemoError(400, "Claim numbering is ambiguous. Check the extracted document before continuing.");
    seenNumbers.add(number);
    const text = claimsText.slice(match.index! + match[0].indexOf(match[1]), starts[index + 1]?.index).trim();
    if (text.length > 20_000) throw new DemoError(400, "A claim exceeds the demo's 20,000 character limit.");
    const dependsOn = new Set<number>();
    for (const reference of text.matchAll(/\bclaims?\s+(\d+)(?:\s*(?:-|–|to|through)\s*(\d+))?((?:\s*(?:,|or|and)\s*\d+)*)/gi)) {
      const first = Number(reference[1]);
      const last = Number(reference[2] || first);
      if (last < first || last - first > 100) throw new DemoError(400, "A dependent claim has an unsupported reference range.");
      for (let parent = first; parent <= last; parent++) dependsOn.add(parent);
      for (const additional of reference[3].matchAll(/\d+/g)) dependsOn.add(Number(additional[0]));
    }
    return { number, text, dependsOn: [...dependsOn] };
  });
}

export function resolveInheritedClaims(claims: DetectedClaim[], selectedNumber: number): DetectedClaim[] {
  const claimsByNumber = new Map(claims.map(claim => [claim.number, claim]));
  const result: DetectedClaim[] = [];
  const completed = new Set<number>();
  const visiting = new Set<number>();
  function visit(claimNumber: number) {
    const claim = claimsByNumber.get(claimNumber);
    if (!claim) throw new DemoError(400, `Referenced claim ${claimNumber} is missing. Include every parent claim.`);
    if (visiting.has(claimNumber)) throw new DemoError(400, "Circular claim dependencies detected.");
    if (completed.has(claimNumber)) return;
    visiting.add(claimNumber);
    for (const parent of claim.dependsOn) visit(parent);
    visiting.delete(claimNumber);
    completed.add(claimNumber);
    if (claimNumber !== selectedNumber) result.push(claim);
  }
  visit(selectedNumber);
  return result;
}

export function buildSources(input: DocumentInput): ClaimSource[] {
  return input.pages.flatMap(page => {
    const paragraphs = page.text.split(/\n\s*\n|(?=\[\d{4,6}\])/).map(part => part.trim()).filter(Boolean);
    const sources: ClaimSource[] = paragraphs.map((text, index) => ({
      id: `page-${page.pageNumber}-passage-${index + 1}`,
      pageNumber: page.pageNumber,
      text,
      label: `${input.inputType === "pdf" ? "Page" : "Text section"} ${page.pageNumber} · ${text.match(/^\[\d{4,6}\]/)?.[0] ?? `passage ${index + 1}`}`,
      visual: false,
    }));
    if (page.imageDataUrl) {
      sources.push({
        id: `page-${page.pageNumber}-image`,
        pageNumber: page.pageNumber,
        text: "",
        label: `Original page ${page.pageNumber} · visual evidence`,
        visual: true,
      });
    }
    return sources;
  });
}

function documentSignature(document: Omit<ClaimDocument, "receipt">, secret: string): string {
  return createHmac("sha256", secret).update(JSON.stringify(document)).digest("hex");
}

export function signDocument(input: DocumentInput, secret: string, warnings: string[], now = Date.now()): ClaimDocument {
  const document = {
    id: randomUUID(), ...input,
    sources: buildSources(input),
    claims: detectClaims(input.pages),
    warnings,
    expiresAt: new Date(now + DOCUMENT_LIMITS.sessionMinutes * 60_000).toISOString(),
  };
  return { ...document, receipt: documentSignature(document, secret) };
}

/** A signed receipt makes request-only documents usable across replicas, without storing uploads. */
export function verifyDocument(document: ClaimDocument, secret: string, now = Date.now()): void {
  const { receipt, ...unsignedDocument } = document;
  const expected = Buffer.from(documentSignature(unsignedDocument, secret), "hex");
  const supplied = /^[a-f0-9]{64}$/.test(receipt) ? Buffer.from(receipt, "hex") : Buffer.alloc(0);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new DemoError(400, "Document verification failed. Prepare the document again.");
  }
  if (Date.parse(document.expiresAt) <= now) {
    throw new DemoError(410, "This document session expired. Clear the session and prepare your patent again.");
  }
}
