import express, { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import type OpenAI from "openai";
import { ZodError } from "zod";
import { DemoError, analysisRequestSchema, documentInputSchema } from "../core/contracts";
import { verifyDocument } from "../core/document";
import { analyzeDocument, prepareDocument } from "./analysis";

export interface DemoRouterOptions {
  client: OpenAI;
  signingSecret: string;
  reserve: (visitorAddress: string) => Promise<() => Promise<void>>;
  /** Log only an event identifier, never request contents or raw model errors. */
  reportFailure?: (event: string) => void;
}

export function createClaimConstructorRouter(options: DemoRouterOptions): IRouter {
  if (options.signingSecret.length < 32) throw new Error("A stable signing secret of at least 32 characters is required.");
  const router = Router();
  router.use((_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    next();
  });
  // Parse locally, ahead of the platform's smaller JSON parser.
  router.use(express.json({ limit: "18mb" }));

  function handle(action: "prepare" | "analyze") {
    return async (request: Request, response: Response) => {
      let release: (() => Promise<void>) | undefined;
      try {
        // Validate untrusted input before consuming daily capacity or contacting the model.
        const preparedInput = action === "prepare" ? documentInputSchema.parse(request.body) : undefined;
        const analysisInput = action === "analyze" ? analysisRequestSchema.parse(request.body) : undefined;
        if (analysisInput) verifyDocument(analysisInput.document, options.signingSecret);
        // Deliberately use the peer address, not arbitrary client-supplied forwarded headers.
        // Shared proxy addresses may share a visitor allowance; the global DB budget remains authoritative.
        release = await options.reserve(request.socket.remoteAddress || "unknown-peer");
        const result = preparedInput
          ? await prepareDocument(preparedInput, options.client, options.signingSecret)
          : await analyzeDocument(analysisInput!.document, analysisInput!.claimNumber, options.client);
        response.json(result);
      } catch (error) {
        if (error instanceof DemoError) {
          if (error.status === 429) response.setHeader("Retry-After", "3600");
          response.status(error.status).json({ error: error.message });
        } else if (error instanceof ZodError && !release) {
          response.status(400).json({ error: error.issues[0]?.message || "Invalid document." });
        } else {
          options.reportFailure?.(`claim-demo-${action}-failed`);
          response.status(503).json({ error: "The demo could not complete this request. Try again later or use a clearer document. No result was saved." });
        }
      } finally {
        await release?.().catch(() => options.reportFailure?.("claim-demo-lease-release-failed"));
      }
    };
  }
  router.post("/prepare", handle("prepare"));
  router.post("/analyze", handle("analyze"));
  router.use((error: { type?: string }, _request: Request, response: Response, _next: NextFunction) => {
    response.status(error.type === "entity.too.large" ? 413 : 400).json({ error: "Invalid or oversized request. Maximum request size is 18 MB." });
  });
  return router;
}
