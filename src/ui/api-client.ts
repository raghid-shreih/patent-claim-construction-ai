import type {
  ClaimAnalysisRequest,
  ClaimDocument,
  ClaimDocumentInput,
  ClaimInterpretation,
  ErrorEnvelope,
} from "./contract-types";
import { MAXIMUM_REQUEST_BODY_BYTES, formatByteSize } from "./input-limits";

export class ClaimConstructorApiError extends Error {
  readonly httpStatus: number;
  constructor(message: string, httpStatus: number) {
    super(message);
    this.name = "ClaimConstructorApiError";
    this.httpStatus = httpStatus;
  }
  get isSessionExpired(): boolean {
    return this.httpStatus === 410;
  }
  get isRetryable(): boolean {
    return this.httpStatus === 0 || this.httpStatus === 429 || this.httpStatus === 503 || this.httpStatus >= 500;
  }
}

function describeHttpStatus(httpStatus: number): string {
  switch (httpStatus) {
    case 400:
      return "The request was rejected as invalid.";
    case 410:
      return "This document session has expired. Load the document again to continue.";
    case 413:
      return "The request was too large for the server.";
    case 429:
      return "Too many requests right now. Wait a moment and try again.";
    case 503:
      return "The analysis service is temporarily unavailable. Try again shortly.";
    default:
      return "The server responded with an unexpected error (" + httpStatus + ").";
  }
}

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  return typeof value === "object" && value !== null && typeof (value as ErrorEnvelope).error === "string";
}

async function postJson<ResponseBody>(url: string, requestBody: unknown, abortSignal?: AbortSignal): Promise<ResponseBody> {
  const serializedBody = JSON.stringify(requestBody);
  const serializedByteSize = new Blob([serializedBody]).size;
  if (serializedByteSize > MAXIMUM_REQUEST_BODY_BYTES) {
    throw new ClaimConstructorApiError(
      "The prepared request is " + formatByteSize(serializedByteSize) + ", above the " +
        formatByteSize(MAXIMUM_REQUEST_BODY_BYTES) + " limit. Try a document with fewer pages.",
      400,
    );
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: serializedBody,
      credentials: "same-origin",
      signal: abortSignal,
    });
  } catch (networkError) {
    if (networkError instanceof DOMException && networkError.name === "AbortError") throw networkError;
    throw new ClaimConstructorApiError("Could not reach the server. Check your connection and try again.", 0);
  }

  if (!response.ok) {
    let errorMessage = describeHttpStatus(response.status);
    try {
      const errorBody: unknown = await response.json();
      if (isErrorEnvelope(errorBody) && errorBody.error.trim()) errorMessage = errorBody.error;
    } catch {
      // Body was not JSON; keep the status description.
    }
    throw new ClaimConstructorApiError(errorMessage, response.status);
  }

  return (await response.json()) as ResponseBody;
}

export interface ClaimConstructorClient {
  prepareDocument(documentInput: ClaimDocumentInput, abortSignal?: AbortSignal): Promise<ClaimDocument>;
  analyzeClaim(analysisRequest: ClaimAnalysisRequest, abortSignal?: AbortSignal): Promise<ClaimInterpretation>;
}

export function createClaimConstructorClient(apiBase: string): ClaimConstructorClient {
  const normalizedApiBase = apiBase.replace(/\/+$/, "");
  return {
    prepareDocument: (documentInput, abortSignal) =>
      postJson<ClaimDocument>(normalizedApiBase + "/prepare", documentInput, abortSignal),
    analyzeClaim: (analysisRequest, abortSignal) =>
      postJson<ClaimInterpretation>(normalizedApiBase + "/analyze", analysisRequest, abortSignal),
  };
}
