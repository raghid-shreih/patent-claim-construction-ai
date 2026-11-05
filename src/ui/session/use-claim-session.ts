import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClaimConstructorApiError, createClaimConstructorClient } from "../api-client";
import type { ClaimDocumentInput, ClaimSourcePage } from "../contract-types";
import { InputLimitError, LOCAL_SESSION_DURATION_MILLISECONDS, MAXIMUM_TITLE_LENGTH } from "../input-limits";
import { extractPdfDocument } from "../pdf/extract-pdf-document";
import { closePdfDocument, type LoadedPdfDocument } from "../pdf/pdf-runtime";
import { splitPastedTextIntoPages } from "../text/split-pasted-text";
import { EMPTY_SESSION_STATE, type ClaimSessionState, type RecoverableError } from "./session-state";

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function toRecoverableError(error: unknown): RecoverableError {
  if (error instanceof ClaimConstructorApiError) {
    return { message: error.message, canRetry: error.isRetryable, requiresReload: error.isSessionExpired };
  }
  if (error instanceof InputLimitError) return { message: error.message, canRetry: false, requiresReload: false };
  const fallbackMessage = error instanceof Error ? error.message : "Something unexpected went wrong.";
  return { message: fallbackMessage, canRetry: true, requiresReload: false };
}

function cleanTitle(rawTitle: string, fallbackTitle: string): string {
  const trimmedTitle = rawTitle.trim() || fallbackTitle;
  return trimmedTitle.slice(0, MAXIMUM_TITLE_LENGTH);
}

export function useClaimSession(apiBase: string) {
  const apiClient = useMemo(() => createClaimConstructorClient(apiBase), [apiBase]);
  const [sessionState, setSessionState] = useState<ClaimSessionState>(EMPTY_SESSION_STATE);

  // Non-serializable resources live in refs and are released by clearSession.
  const loadedPdfRef = useRef<LoadedPdfDocument | null>(null);
  const pdfBlobUrlRef = useRef<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loadedPdfDocument, setLoadedPdfDocument] = useState<LoadedPdfDocument | null>(null);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const lastDocumentInputRef = useRef<ClaimDocumentInput | null>(null);
  const expiryTimerRef = useRef<number | null>(null);

  const releaseLocalResources = useCallback(() => {
    activeAbortControllerRef.current?.abort();
    activeAbortControllerRef.current = null;
    if (pdfBlobUrlRef.current) URL.revokeObjectURL(pdfBlobUrlRef.current);
    pdfBlobUrlRef.current = null;
    setPdfBlobUrl(null);
    if (loadedPdfRef.current) void closePdfDocument(loadedPdfRef.current);
    loadedPdfRef.current = null;
    setLoadedPdfDocument(null);
    lastDocumentInputRef.current = null;
    if (expiryTimerRef.current !== null) window.clearTimeout(expiryTimerRef.current);
    expiryTimerRef.current = null;
  }, []);

  const clearSession = useCallback(
    (sessionEndedNotice: string | null = null) => {
      releaseLocalResources();
      setSessionState({ ...EMPTY_SESSION_STATE, sessionEndedNotice });
    },
    [releaseLocalResources],
  );

  useEffect(() => () => releaseLocalResources(), [releaseLocalResources]);

  const startExpiryTimer = useCallback(() => {
    if (expiryTimerRef.current !== null) window.clearTimeout(expiryTimerRef.current);
    expiryTimerRef.current = window.setTimeout(() => {
      clearSession("Your 30-minute session ended. The document and results were cleared from this page.");
    }, LOCAL_SESSION_DURATION_MILLISECONDS);
    return Date.now() + LOCAL_SESSION_DURATION_MILLISECONDS;
  }, [clearSession]);

  const sendDocumentForPreparation = useCallback(
    async (documentInput: ClaimDocumentInput) => {
      lastDocumentInputRef.current = documentInput;
      const abortController = new AbortController();
      activeAbortControllerRef.current = abortController;
      setSessionState((previous) => ({
        ...previous,
        workflowPhase: "preparing",
        intakeError: null,
        progress: {
          stageLabel: "Preparing sources",
          detail: "Sending " + documentInput.pages.length + " page" + (documentInput.pages.length === 1 ? "" : "s") +
            " for claim detection" + (documentInput.inputType === "pdf" ? " and figure reading" : ""),
          completedUnits: 0,
          totalUnits: 1,
        },
      }));
      try {
        const preparedDocument = await apiClient.prepareDocument(documentInput, abortController.signal);
        const sessionExpiresAtMilliseconds = startExpiryTimer();
        setSessionState((previous) => ({
          ...previous,
          workflowPhase: "ready",
          progress: null,
          preparedDocument,
          selectedClaimNumber: preparedDocument.claims[0]?.number ?? null,
          sessionExpiresAtMilliseconds,
        }));
      } catch (preparationError) {
        if (isAbortError(preparationError)) return;
        setSessionState((previous) => ({
          ...previous,
          workflowPhase: "intake",
          progress: null,
          intakeError: toRecoverableError(preparationError),
        }));
      } finally {
        if (activeAbortControllerRef.current === abortController) activeAbortControllerRef.current = null;
      }
    },
    [apiClient, startExpiryTimer],
  );

  const loadPdfFile = useCallback(
    async (pdfFile: File, documentTitle: string) => {
      releaseLocalResources();
      const extractionAbortController = new AbortController();
      activeAbortControllerRef.current = extractionAbortController;
      setSessionState({
        ...EMPTY_SESSION_STATE,
        workflowPhase: "extracting",
        inputType: "pdf",
        progress: { stageLabel: "Reading PDF", detail: "Opening file", completedUnits: 0, totalUnits: 1 },
      });
      let extractedPages: ClaimSourcePage[];
      try {
        const extractedPdf = await extractPdfDocument(
          pdfFile,
          (extractionProgress) =>
            setSessionState((previous) => ({
              ...previous,
              progress: {
                stageLabel: "Reading PDF in this browser",
                detail: extractionProgress.currentActivity,
                completedUnits: extractionProgress.completedPageCount,
                totalUnits: Math.max(extractionProgress.totalPageCount, 1),
              },
            })),
          () => extractionAbortController.signal.aborted,
        );
        if (extractionAbortController.signal.aborted) {
          void closePdfDocument(extractedPdf.loadedPdfDocument);
          return;
        }
        loadedPdfRef.current = extractedPdf.loadedPdfDocument;
        setLoadedPdfDocument(extractedPdf.loadedPdfDocument);
        const createdBlobUrl = URL.createObjectURL(pdfFile);
        pdfBlobUrlRef.current = createdBlobUrl;
        setPdfBlobUrl(createdBlobUrl);
        extractedPages = extractedPdf.pages;
      } catch (extractionError) {
        if (isAbortError(extractionError)) return;
        setSessionState((previous) => ({
          ...previous,
          workflowPhase: "intake",
          progress: null,
          intakeError: toRecoverableError(extractionError),
        }));
        return;
      }
      await sendDocumentForPreparation({
        title: cleanTitle(documentTitle, pdfFile.name.replace(/\.pdf$/i, "")),
        inputType: "pdf",
        pages: extractedPages,
      });
    },
    [releaseLocalResources, sendDocumentForPreparation],
  );

  const loadPastedText = useCallback(
    async (pastedText: string, documentTitle: string) => {
      releaseLocalResources();
      setSessionState({ ...EMPTY_SESSION_STATE, inputType: "text" });
      let textPages: ClaimSourcePage[];
      try {
        textPages = splitPastedTextIntoPages(pastedText);
      } catch (splitError) {
        setSessionState((previous) => ({ ...previous, intakeError: toRecoverableError(splitError) }));
        return;
      }
      await sendDocumentForPreparation({
        title: cleanTitle(documentTitle, "Pasted patent text"),
        inputType: "text",
        pages: textPages,
      });
    },
    [releaseLocalResources, sendDocumentForPreparation],
  );

  const retryPreparation = useCallback(() => {
    const previousInput = lastDocumentInputRef.current;
    if (previousInput) void sendDocumentForPreparation(previousInput);
  }, [sendDocumentForPreparation]);

  const cancelInProgressWork = useCallback(() => {
    clearSession(null);
  }, [clearSession]);

  const selectClaim = useCallback((claimNumber: number) => {
    setSessionState((previous) => ({
      ...previous,
      selectedClaimNumber: claimNumber,
      evidenceSelection: null,
      analysisError: null,
    }));
  }, []);

  const preparedDocument = sessionState.preparedDocument;
  const analyzeClaim = useCallback(
    async (claimNumber: number) => {
      if (!preparedDocument) return;
      const abortController = new AbortController();
      activeAbortControllerRef.current = abortController;
      setSessionState((previous) => ({
        ...previous,
        analyzingClaimNumber: claimNumber,
        analysisError: null,
        evidenceSelection: null,
      }));
      try {
        const interpretation = await apiClient.analyzeClaim(
          { document: preparedDocument, claimNumber },
          abortController.signal,
        );
        setSessionState((previous) => ({
          ...previous,
          analyzingClaimNumber: null,
          interpretationsByClaimNumber: { ...previous.interpretationsByClaimNumber, [claimNumber]: interpretation },
          evidenceSelection: interpretation.terms.length > 0 ? { termIndex: 0, evidenceIndex: 0 } : null,
        }));
      } catch (analysisError) {
        if (isAbortError(analysisError)) return;
        setSessionState((previous) => ({
          ...previous,
          analyzingClaimNumber: null,
          analysisError: toRecoverableError(analysisError),
        }));
      } finally {
        if (activeAbortControllerRef.current === abortController) activeAbortControllerRef.current = null;
      }
    },
    [apiClient, preparedDocument],
  );

  const selectEvidence = useCallback((termIndex: number, evidenceIndex = 0) => {
    setSessionState((previous) => ({ ...previous, evidenceSelection: { termIndex, evidenceIndex } }));
  }, []);

  const dismissNotice = useCallback(() => {
    setSessionState((previous) => ({ ...previous, sessionEndedNotice: null }));
  }, []);

  return {
    sessionState,
    loadedPdfDocument,
    pdfBlobUrl,
    loadPdfFile,
    loadPastedText,
    retryPreparation,
    cancelInProgressWork,
    clearSession,
    selectClaim,
    analyzeClaim,
    selectEvidence,
    dismissNotice,
  };
}
