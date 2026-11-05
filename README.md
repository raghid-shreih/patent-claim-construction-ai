# Patent Claim Construction AI

A source-linked patent reading tool: upload a patent PDF or paste its description and numbered claims, select a claim, and inspect proposed term meanings with clickable supporting passages or original page images.

**This is AI-assisted, specification-based research—not a legal opinion or a binding construction.** Prosecution history, case law, jurisdiction-specific rules, infringement, and validity analysis are outside its scope.

## Run independently

Requires Node.js 24+, pnpm, and PostgreSQL. This directory is self-contained: it does not require the Nuvopatents monorepo, Clerk, Stripe, or platform database tables.

1. Copy this directory into its own repository, excluding ignored output and private environment files.
2. Run `pnpm install`.
3. Set environment variables from `.env.example` privately. Use either `OPENAI_API_KEY` (optionally `OPENAI_BASE_URL`) or the existing Replit AI integration variables `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL`.
4. Supply a PostgreSQL connection in `DATABASE_URL`. A quota table and index are created lazily; the DB user needs permission to create them. Only request counts, timestamps, and keyed visitor hashes are retained, never documents or analysis.
5. Set a random `SESSION_SECRET` of at least 32 characters, shared across all replicas. Changing it intentionally invalidates document receipts.
6. Run `pnpm build`, then `pnpm start`. Open port 3000, or set `PORT`.
7. For changes, run `pnpm typecheck` and `pnpm test`, then rebuild the frontend. `pnpm dev` starts the TypeScript server; it serves the latest built frontend.

The model is fixed to `gpt-5.4-mini` to keep the public demo's cost envelope bounded. Replit AI access needs no separate user key and is billed to the project’s credits. Independent deployments pay their configured provider.

## Architecture

```text
Browser-only PDF.js extraction and original-page viewer
    → POST /api/claim-constructor/prepare
    → bounded image normalization + visual transcription when needed
    → numbered claims + stable passage/page references + signed 30-minute receipt
    → POST /api/claim-constructor/analyze (selected claim and complete signed document)
    → parent-claim resolution → text/image model analysis
    → exact quotation checks → evidence-linked result
```

- `src/core/contracts.ts`: validated types and explicit limits.
- `src/core/document.ts`: claims, dependency resolution, stable sources, signed receipts.
- `src/core/evidence.ts`: rejects nonexistent references and unmatched quotations; withholds unsupported interpretations.
- `src/server/analysis.ts`: the bounded AI workflow. Patent content is untrusted data, never instructions.
- `src/server/quota.ts`: persistent, transactional request reservations shared across replicas.
- `src/server/router.ts`: transport and safe error boundaries, without any platform authentication dependency.
- `src/ui/`: portable React experience, PDF intake, claim results, and source inspection.
- `standalone/`: independent server and Vite entry points.
- `test/`: parsing, grounding, expiry, quota, and request-boundary regressions.

The full platform imports the same modules. There is no second copy of the analysis engine.

## Evidence and limitations

Definitions and inferences are labeled separately. Text quotations must exactly match the cited source after whitespace normalization. Visual evidence references an actual supplied page, without manufacturing a text quotation. A model's visual interpretation and legal reasoning cannot be mechanically proven; inspect the original document.

Dependent claims include their referenced parent claims. Multiple-dependent alternatives are explicitly treated as alternatives in the analysis instructions. Missing or circular references fail rather than guessing.

PDF extraction supports text and scanned pages, including drawings. Some OCR will be inaccurate, particularly at low resolution. The demo rejects unsupported or oversized input rather than silently cutting it down. Claim detection requires a separate **Claims**, **What is claimed is:**, **We claim:**, or **I claim:** heading and numbered claims.

The included educational sample is fictional, explicitly labeled as such, and is not presented as a real patent or real legal advice. Use published public patent material for your own examples, respecting applicable rights.

## Privacy and abuse controls

- Original PDF bytes stay in the browser. Text and normalized page images are sent to the server and AI provider for analysis.
- The server keeps document content only during a request; no document store, shared document cache, or permanent results.
- Browser document state is in memory, cleared on reload or Clear session, and expires after 30 minutes. Model-provider retention policies still apply. Do not submit confidential or unpublished material.
- Stateless HMAC receipts prevent document tampering and allow requests to use any server replica without saving documents.
- 16 pages, 12 MB original PDF, 100,000 text characters total, 20,000 per page, 800 KB per JPEG, and an 18 MB HTTP body limit.
- All page images are decoded and resized server-side to at most 768 pixels on the longest side.
- Fixed model, bounded input/output, no automatic provider retries, a 100-second model timeout, and a database-enforced limit of 60 requests per UTC day across all replicas. Visual transcription is at most one provider call in prepare; analysis is at most one provider call. Output ceilings: 12,000 transcription tokens or 6,500 analysis tokens.
- At most 10 requests per peer address per rolling day, 6 global requests per minute, and 2 concurrent requests. An expired concurrency lease recovers after a crashed process. Invalid signed documents are rejected before quota reservation.
- The peer address is used instead of trusting spoofable forwarded headers. Behind a shared reverse proxy, visitors may share an allowance; this is conservative. The global spending ceiling remains authoritative. A deployment-specific trusted-client-IP adapter can refine fairness later.
- Failed attempts consume reservations, preventing repeat failures from bypassing the budget. Quota records expire after two days; cleanup runs on subsequent requests.
- No request bodies, model responses, raw provider errors, or credentials are written to application logs. Hosting-provider access logs and provider policies remain outside this application.

The call ceiling is a spending protection, **not a currency-denominated invoice cap**; model pricing can change. Configure provider-side account budgets as an additional safeguard.

## Portfolio publication

This directory—not the full platform repository—is the source publication boundary for `patent-claim-construction-ai`. It is released under the [MIT License](LICENSE).

Run `pnpm test` and `pnpm typecheck`, review the exact tracked files, and use a **fresh Git history** for the standalone repository. Never push the parent repository's history, private platform code, `.env` files, uploaded documents, or unpublished research.

## Screenshots

![Claim Constructor desktop input](docs/claim-constructor-desktop.jpg)

The deployment's Coming Soon gate is illustrated in `docs/coming-soon-mobile.jpg`. A verified live demo link will be added after publishing; no production URL is claimed in advance.
