import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { extractPageTextWithLineBreaks } from "../src/ui/pdf/pdf-text-extraction";
import { detectClaims } from "../src/core/document";

test("a real two-page PDF preserves claim newlines and source page identity", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "claim-pdf-test-"));
  try {
    const fixturePath = path.join(directory, "fictional.pdf");
    execFileSync(process.execPath, ["--import", "tsx", "test/fixtures/create-pdf.ts", fixturePath]);
    const document = await getDocument({ data: new Uint8Array(await readFile(fixturePath)), useSystemFonts: true }).promise;
    try {
      assert.equal(document.numPages, 2);
      const pages = [];
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
        const page = await document.getPage(pageNumber);
        pages.push({ pageNumber, text: await extractPageTextWithLineBreaks(page) });
      }
      const claims = detectClaims(pages);
      assert.deepEqual(claims.map(claim => claim.number), [1, 2]);
      assert.deepEqual(claims[1].dependsOn, [1]);
      assert.match(pages[1].text, /Figure 1/);
    } finally { await document.destroy(); }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
