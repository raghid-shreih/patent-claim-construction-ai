import { useEffect, useRef, useState } from "react";
import type { LoadedPdfDocument } from "../pdf/pdf-runtime";

interface PdfPageCanvasProps {
  loadedPdfDocument: LoadedPdfDocument;
  pageNumber: number;
  fallbackImageDataUrl?: string;
}

/** Draws one page of the original PDF with PDF.js, sized to the container width. */
export function PdfPageCanvas({ loadedPdfDocument, pageNumber, fallbackImageDataUrl }: PdfPageCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderStatus, setRenderStatus] = useState<"rendering" | "rendered" | "failed">("rendering");

  useEffect(() => {
    let isStale = false;
    let activeRenderTask: { cancel: () => void } | null = null;
    setRenderStatus("rendering");

    async function drawPage() {
      const containerElement = containerRef.current;
      const canvasElement = canvasRef.current;
      if (!containerElement || !canvasElement) return;
      try {
        const pdfPage = await loadedPdfDocument.getPage(pageNumber);
        if (isStale) return;
        const naturalViewport = pdfPage.getViewport({ scale: 1 });
        const availableWidth = Math.max(containerElement.clientWidth, 240);
        const pixelRatio = window.devicePixelRatio || 1;
        const displayScale = availableWidth / naturalViewport.width;
        const renderViewport = pdfPage.getViewport({ scale: displayScale * pixelRatio });
        canvasElement.width = Math.floor(renderViewport.width);
        canvasElement.height = Math.floor(renderViewport.height);
        canvasElement.style.width = availableWidth + "px";
        canvasElement.style.height = Math.floor(naturalViewport.height * displayScale) + "px";
        const drawingContext = canvasElement.getContext("2d");
        if (!drawingContext) throw new Error("No drawing context");
        const renderTask = pdfPage.render({ canvas: canvasElement, canvasContext: drawingContext, viewport: renderViewport });
        activeRenderTask = renderTask;
        await renderTask.promise;
        if (!isStale) setRenderStatus("rendered");
      } catch (renderError) {
        if (!isStale && !(renderError instanceof Error && renderError.name === "RenderingCancelledException")) {
          setRenderStatus("failed");
        }
      }
    }

    void drawPage();
    return () => {
      isStale = true;
      activeRenderTask?.cancel();
    };
  }, [loadedPdfDocument, pageNumber]);

  return (
    <div className="ncc-page-frame" ref={containerRef} data-testid={"pdf-page-" + pageNumber}>
      {renderStatus === "rendering" && <div className="ncc-page-skeleton" aria-hidden="true" />}
      {renderStatus === "failed" && fallbackImageDataUrl && (
        <img src={fallbackImageDataUrl} alt={"Rendered image of page " + pageNumber} className="ncc-page-image" />
      )}
      {renderStatus === "failed" && !fallbackImageDataUrl && (
        <p className="ncc-muted">Page {pageNumber} could not be drawn in this browser.</p>
      )}
      <canvas
        ref={canvasRef}
        className="ncc-page-canvas"
        hidden={renderStatus === "failed"}
        aria-label={"Original PDF page " + pageNumber}
        role="img"
      />
    </div>
  );
}
