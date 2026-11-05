import type { ProgressReport } from "../session/session-state";

interface ProgressPanelProps {
  progress: ProgressReport;
  isIndeterminate: boolean;
  onCancel: () => void;
}

export function ProgressPanel({ progress, isIndeterminate, onCancel }: ProgressPanelProps) {
  const completedFraction = progress.totalUnits > 0 ? progress.completedUnits / progress.totalUnits : 0;
  return (
    <section className="ncc-progress" role="status" aria-live="polite" data-testid="status-progress">
      <div className="ncc-progress-head">
        <span className="ncc-eyebrow">{progress.stageLabel}</span>
        {!isIndeterminate && (
          <span className="ncc-mono">
            {progress.completedUnits} / {progress.totalUnits}
          </span>
        )}
      </div>
      <p className="ncc-progress-detail">{progress.detail}</p>
      <div
        className={"ncc-progress-track" + (isIndeterminate ? " ncc-progress-indeterminate" : "")}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progress.totalUnits}
        aria-valuenow={isIndeterminate ? undefined : progress.completedUnits}
      >
        <div className="ncc-progress-fill" style={{ transform: "scaleX(" + (isIndeterminate ? 1 : completedFraction) + ")" }} />
      </div>
      <button type="button" className="ncc-button ncc-button-quiet" onClick={onCancel} data-testid="button-cancel-progress">
        Cancel and clear
      </button>
    </section>
  );
}
