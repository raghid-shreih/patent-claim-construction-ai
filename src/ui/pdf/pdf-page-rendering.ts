import type { PDFPageProxy } from "pdfjs-dist";
import {
  InputLimitError,
  MAXIMUM_PAGE_IMAGE_BYTES,
  PAGE_IMAGE_JPEG_QUALITY,
  PAGE_IMAGE_LONGEST_EDGE_PIXELS,
  formatByteSize,
} from "../input-limits";

function estimateDataUrlByteSize(dataUrl: string): number {
  const base64Payload = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.floor((base64Payload.length * 3) / 4);
}

/** Renders a page to a JPEG data URL whose longest edge is at most 768px. */
export async function renderPageToJpegDataUrl(pdfPage: PDFPageProxy): Promise<string> {
  const naturalViewport = pdfPage.getViewport({ scale: 1 });
  const longestNaturalEdge = Math.max(naturalViewport.width, naturalViewport.height);
  const renderScale = PAGE_IMAGE_LONGEST_EDGE_PIXELS / longestNaturalEdge;
  const scaledViewport = pdfPage.getViewport({ scale: renderScale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(scaledViewport.width);
  canvas.height = Math.floor(scaledViewport.height);
  const drawingContext = canvas.getContext("2d");
  if (!drawingContext) throw new Error("This browser could not create a drawing surface for page images.");

  drawingContext.fillStyle = "#fffdf8";
  drawingContext.fillRect(0, 0, canvas.width, canvas.height);
  await pdfPage.render({ canvas, canvasContext: drawingContext, viewport: scaledViewport }).promise;

  const jpegDataUrl = canvas.toDataURL("image/jpeg", PAGE_IMAGE_JPEG_QUALITY);
  canvas.width = 0;
  canvas.height = 0;

  const imageByteSize = estimateDataUrlByteSize(jpegDataUrl);
  if (imageByteSize > MAXIMUM_PAGE_IMAGE_BYTES) {
    throw new InputLimitError(
      "Page " + pdfPage.pageNumber + " renders to " + formatByteSize(imageByteSize) +
        ", above the " + formatByteSize(MAXIMUM_PAGE_IMAGE_BYTES) + " per-image limit.",
    );
  }
  return jpegDataUrl;
}
