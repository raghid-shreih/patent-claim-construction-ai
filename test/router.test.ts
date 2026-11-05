import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type OpenAI from "openai";
import sharp from "sharp";
import { createClaimConstructorRouter } from "../src/server/router";
import { normalizePageImages } from "../src/server/analysis";
import { DemoError } from "../src/core/contracts";

const input = {
  title: "Fictional sample", inputType: "text",
  pages: [{ pageNumber: 1, text: "DESCRIPTION\n\n[0001] A coupling is a detachable connector between two parts.\n\nCLAIMS\n1. A system comprising a coupling." }],
};
const secret = "router-test-secret-for-stateless-document-signatures";

test("public prepare/analyze require no auth, validate receipts, and do not persist documents", async () => {
  let reservedCount = 0;
  let providerCount = 0;
  const fakeClient = { chat: { completions: { create: async () => {
    providerCount++;
    return { choices: [{ finish_reason: "stop", message: { content: JSON.stringify({
      summary: "A system with a detachable connector.",
      terms: [{ term: "coupling", meaning: "A detachable connector.", basis: "explicit", evidence: [{ sourceId: "page-1-passage-2", quote: "A coupling is a detachable connector" }], caveat: "" }],
      warnings: [],
    }) } }] };
  } } } } as unknown as OpenAI;
  const application = express().use("/demo", createClaimConstructorRouter({
    client: fakeClient, signingSecret: secret,
    reserve: async () => { reservedCount++; return async () => {}; },
  }));
  const server = application.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/demo`;
  try {
    const prepared = await fetch(`${base}/prepare`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    assert.equal(prepared.status, 200);
    assert.equal(prepared.headers.get("cache-control"), "no-store");
    const document = await prepared.json();
    assert.equal(providerCount, 0); // Text preparation does not spend model tokens.
    const analyze = (value: unknown) => fetch(`${base}/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
    const analysisResponse = await analyze({ document, claimNumber: 1 });
    assert.equal(analysisResponse.status, 200);
    const result = await analysisResponse.json();
    assert.equal(result.terms[0].evidence.length, 1);
    assert.equal(providerCount, 1);
    assert.equal(reservedCount, 2);
    const tampered = await analyze({ document: { ...document, title: "modified" }, claimNumber: 1 });
    assert.equal(tampered.status, 400);
    assert.equal(reservedCount, 2); // Invalid receipts never reserve a model call.
  } finally { server.close(); }
});

test("quota denial never reaches provider", async () => {
  const application = express().use(createClaimConstructorRouter({
    client: {} as OpenAI, signingSecret: secret,
    reserve: async () => { throw new DemoError(429, "Demo budget reached"); },
  }));
  const server = application.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/prepare`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    assert.equal(response.status, 429);
    assert.ok(response.headers.get("retry-after"));
  } finally { server.close(); }
});

test("page images are decoded, bounded and re-encoded, not trusted as opaque base64", async () => {
  const jpeg = await sharp({ create: { width: 1000, height: 1000, channels: 3, background: "white" } }).jpeg().toBuffer();
  const pages = await normalizePageImages([{ pageNumber: 1, text: "", imageDataUrl: `data:image/jpeg;base64,${jpeg.toString("base64")}` }]);
  const metadata = await sharp(Buffer.from(pages[0].imageDataUrl!.split(",")[1], "base64")).metadata();
  assert.equal(metadata.width, 768);
  await assert.rejects(normalizePageImages([{ pageNumber: 1, text: "", imageDataUrl: "data:image/jpeg;base64,ZmFrZQ==" }]), /invalid/);
});
