/** Rebuild the browser-safe illustration fixture without a provider call or database. */
import { writeFile } from "node:fs/promises";
import { buildSources, detectClaims } from "../../src/core/document";
import type { ClaimDocument } from "../../src/core/contracts";
import { SAMPLE_DOCUMENT_TEXT, SAMPLE_DOCUMENT_TITLE } from "../../src/ui/sample-document";

const examplePages = [{ pageNumber: 1, text: SAMPLE_DOCUMENT_TEXT }];
const document: ClaimDocument = {
  id: "00000000-0000-4000-8000-000000000001",
  title: SAMPLE_DOCUMENT_TITLE,
  inputType: "text",
  pages: examplePages,
  sources: buildSources({ title: SAMPLE_DOCUMENT_TITLE, inputType: "text", pages: examplePages }),
  claims: detectClaims(examplePages),
  warnings: [],
  expiresAt: "2099-01-01T00:00:00.000Z",
  receipt: "documentation-only-invalid-receipt-do-not-send-to-the-api",
};

await writeFile(new URL("./example-document.json", import.meta.url), JSON.stringify(document, null, 2) + "\n");
console.log("Created the fictional, render-only documentation fixture.");
