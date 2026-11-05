import express from "express";
import OpenAI from "openai";
import pg from "pg";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClaimConstructorRouter } from "../src/server/router";
import { PostgresQuota } from "../src/server/quota";

const signingSecret = process.env.SESSION_SECRET || "";
const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL;
if (!apiKey || !process.env.DATABASE_URL || signingSecret.length < 32) {
  throw new Error("Configure an AI provider key, DATABASE_URL, and SESSION_SECRET (at least 32 characters). See README.");
}

const application = express();
application.disable("x-powered-by");
const quotaPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const quota = new PostgresQuota(quotaPool, signingSecret);
application.use("/api/claim-constructor", createClaimConstructorRouter({
  client: new OpenAI({ apiKey, baseURL, maxRetries: 0 }),
  signingSecret,
  reserve: address => quota.reserve(address),
  reportFailure: event => process.stderr.write(JSON.stringify({ event }) + "\n"),
}));
const publicDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist-web");
application.use(express.static(publicDirectory));
application.get("/{*path}", (_request, response) => response.sendFile(path.join(publicDirectory, "index.html")));
const server = application.listen(Number(process.env.PORT || 3000), "0.0.0.0");
process.on("SIGTERM", () => server.close(() => { void quotaPool.end(); }));
