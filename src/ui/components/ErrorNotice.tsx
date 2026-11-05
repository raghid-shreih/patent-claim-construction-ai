import type { RecoverableError } from "../session/session-state";

interface ErrorNoticeProps {
  error: RecoverableError;
  onRetry?: () => void;
  onStartOver: () => void;
}

export function ErrorNotice({ error, onRetry, onStartOver }: ErrorNoticeProps) {
  return (
    <div className="ncc-error" role="alert" data-testid="status-error">
      <p>{error.message}</p>
      <div className="ncc-row">
        {error.canRetry && onRetry && (
          <button type="button" className="ncc-button" onClick={onRetry} data-testid="button-retry">
            Try again
          </button>
        )}
        {error.requiresReload && (
          <button type="button" className="ncc-button" onClick={onStartOver} data-testid="button-start-over">
            Clear and start over
          </button>
        )}
      </div>
    </div>
  );
}
