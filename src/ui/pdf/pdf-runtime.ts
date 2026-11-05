import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type LoadedPdfDocument = PDFDocumentProxy;

export async function openPdfFromBytes(pdfBytes: ArrayBuffer): Promise<LoadedPdfDocument> {
  const loadingTask = getDocument({ data: new Uint8Array(pdfBytes) });
  return loadingTask.promise;
}

/** Releases the worker-side document and its memory. */
export async function closePdfDocument(loadedPdfDocument: LoadedPdfDocument): Promise<void> {
  await loadedPdfDocument.loadingTask.destroy();
}
