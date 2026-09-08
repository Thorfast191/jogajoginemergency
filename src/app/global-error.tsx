"use client";

import { useEffect } from "react";

/**
 * The last resort: an error in the root layout itself, which replaces the
 * whole document. It cannot rely on any of the app's own styling or providers
 * having loaded, so everything here is inline and self-contained.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error boundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#FBF9F6",
          color: "#171717",
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>Jogajog Emergency is temporarily unavailable</h1>
          <p style={{ marginTop: 8, fontSize: 14, color: "rgba(0,0,0,0.6)" }}>
            Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 500,
              color: "#fff",
              background: "#059669",
              border: 0,
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ marginTop: 24, fontSize: 11, color: "rgba(0,0,0,0.4)" }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
