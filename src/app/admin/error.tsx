"use client";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="error-box">
      <h2>Something went wrong</h2>
      <p>The page could not be loaded. Check your connection and try again.</p>
      <button type="button" className="primary-btn" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
