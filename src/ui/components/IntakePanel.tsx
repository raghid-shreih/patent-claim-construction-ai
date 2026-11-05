import { useId, useRef, useState, type DragEvent, type FormEvent } from "react";
import { MAXIMUM_PAGE_COUNT, MAXIMUM_PDF_FILE_BYTES, MAXIMUM_TOTAL_CHARACTERS, formatByteSize } from "../input-limits";
import { SAMPLE_DOCUMENT_TEXT, SAMPLE_DOCUMENT_TITLE } from "../sample-document";
import { QuotaNotice } from "./SessionNotices";

type IntakeMode = "pdf" | "text";

interface IntakePanelProps {
  onSubmitPdf: (pdfFile: File, documentTitle: string) => void;
  onSubmitText: (pastedText: string, documentTitle: string) => void;
}

export function IntakePanel({ onSubmitPdf, onSubmitText }: IntakePanelProps) {
  const [intakeMode, setIntakeMode] = useState<IntakeMode>("pdf");
  const [documentTitle, setDocumentTitle] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [chosenPdfFile, setChosenPdfFile] = useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const titleFieldId = useId();
  const textFieldId = useId();

  function handleDroppedFile(dragEvent: DragEvent<HTMLLabelElement>) {
    dragEvent.preventDefault();
    setIsDraggingFile(false);
    const droppedFile = dragEvent.dataTransfer.files[0];
    if (droppedFile) setChosenPdfFile(droppedFile);
  }

  function loadSampleDocument() {
    setIntakeMode("text");
    setDocumentTitle(SAMPLE_DOCUMENT_TITLE);
    setPastedText(SAMPLE_DOCUMENT_TEXT);
  }

  function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    if (intakeMode === "pdf" && chosenPdfFile) onSubmitPdf(chosenPdfFile, documentTitle);
    if (intakeMode === "text" && pastedText.trim()) onSubmitText(pastedText, documentTitle);
  }

  const canSubmit = intakeMode === "pdf" ? chosenPdfFile !== null : pastedText.trim().length > 0;

  return (
    <form className="ncc-intake" onSubmit={handleSubmit}>
      <div className="ncc-tabs" role="tablist" aria-label="Document source">
        {(["pdf", "text"] as const).map((modeOption) => (
          <button
            key={modeOption}
            type="button"
            role="tab"
            aria-selected={intakeMode === modeOption}
            className="ncc-tab"
            onClick={() => setIntakeMode(modeOption)}
            data-testid={"tab-intake-" + modeOption}
          >
            {modeOption === "pdf" ? "Upload PDF" : "Paste text"}
          </button>
        ))}
      </div>

      <label className="ncc-field-label" htmlFor={titleFieldId}>
        Title <span className="ncc-muted">(optional)</span>
      </label>
      <input
        id={titleFieldId}
        className="ncc-input"
        value={documentTitle}
        maxLength={200}
        onChange={(changeEvent) => setDocumentTitle(changeEvent.target.value)}
        placeholder="e.g. US 0,000,000 B2, claims and description"
        data-testid="input-title"
      />

      {intakeMode === "pdf" ? (
        <>
          <label
            className={"ncc-dropzone" + (isDraggingFile ? " is-dragging" : "")}
            onDragOver={(dragEvent) => {
              dragEvent.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={handleDroppedFile}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="ncc-visually-hidden"
              onChange={(changeEvent) => setChosenPdfFile(changeEvent.target.files?.[0] ?? null)}
              data-testid="input-pdf-file"
            />
            <span className="ncc-dropzone-title">
              {chosenPdfFile ? chosenPdfFile.name : "Choose a published patent PDF"}
            </span>
            <span className="ncc-muted">
              {chosenPdfFile
                ? formatByteSize(chosenPdfFile.size)
                : "Drop here or press to browse. Up to " + MAXIMUM_PAGE_COUNT + " pages and " +
                  formatByteSize(MAXIMUM_PDF_FILE_BYTES) + "."}
            </span>
          </label>
          <p className="ncc-hint">
            Every page is read in your browser: its text, with line breaks kept so column line numbers stay
            visible, and a small image so figures can be read. Only that text and those page images are sent. The
            original file is never uploaded.
          </p>
        </>
      ) : (
        <>
          <label className="ncc-field-label" htmlFor={textFieldId}>
            Patent text, including claims
          </label>
          <textarea
            id={textFieldId}
            className="ncc-textarea"
            value={pastedText}
            onChange={(changeEvent) => setPastedText(changeEvent.target.value)}
            rows={12}
            spellCheck={false}
            placeholder="Paste the claims together with the description so terms can be traced back to their support."
            data-testid="input-pasted-text"
          />
          <div className="ncc-row ncc-row-between">
            <span className="ncc-mono ncc-muted">
              {pastedText.length.toLocaleString()} / {MAXIMUM_TOTAL_CHARACTERS.toLocaleString()} characters
            </span>
          </div>
          <p className="ncc-hint ncc-hint-warn">
            Pasted text has no drawings, so terms that depend on figures will show as unsupported or inferred. Include a standalone "Claims" or "What is claimed is:" heading, and keep each numbered claim on its own line.
          </p>
        </>
      )}

      <QuotaNotice />
      <div className="ncc-row ncc-row-between ncc-intake-actions">
        <button type="button" className="ncc-button ncc-button-quiet" onClick={loadSampleDocument} data-testid="button-load-sample">
          Load fictional sample
        </button>
        <button type="submit" className="ncc-button ncc-button-primary" disabled={!canSubmit} data-testid="button-prepare">
          Find the claims
        </button>
      </div>
    </form>
  );
}
