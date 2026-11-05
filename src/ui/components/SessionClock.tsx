import { useEffect, useState } from "react";

export function SessionClock({ expiresAtMilliseconds }: { expiresAtMilliseconds: number }) {
  const [currentMilliseconds, setCurrentMilliseconds] = useState(() => Date.now());
  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentMilliseconds(Date.now()), 15_000);
    return () => window.clearInterval(intervalId);
  }, []);
  const remainingMinutes = Math.max(0, Math.ceil((expiresAtMilliseconds - currentMilliseconds) / 60_000));
  return (
    <span className="ncc-mono ncc-clock" data-testid="text-session-remaining" title="Local session time remaining">
      {remainingMinutes} min left
    </span>
  );
}
