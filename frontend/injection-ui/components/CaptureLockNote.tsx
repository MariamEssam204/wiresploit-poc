/**
 * Module: CaptureLockNote
 * Purpose: Explain why injection is disabled while capture is stopped.
 * Owner: Injection team
 */

export default function CaptureLockNote() {
  return (
    <p className="hint">
      Press <strong>Start capture</strong> to enable injection. Injection events are only
      recorded while capturing.
    </p>
  );
}
