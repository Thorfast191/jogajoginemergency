"use client";

import { useState } from "react";

export function RelayForm({ shortCode }: { shortCode: string }) {
  const [finderContact, setFinderContact] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    // A finder is often on a weak mobile signal. A request that never arrives
    // must say so, not leave the button stuck on "Sending…".
    let res: Response;
    try {
      res = await fetch(`/api/relay/${shortCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finderContact, message }),
      });
    } catch {
      setError("Couldn't send — check your connection and try again.");
      setStatus("error");
      return;
    }

    if (res.ok) {
      setStatus("sent");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="text-sm text-emerald-700 text-center bg-emerald-50 rounded-md px-3 py-3">
        Thanks! Your message was sent to the owner — they&apos;ll be in touch.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="finderContact">
          Your phone or email (so the owner can reply)
        </label>
        <input
          id="finderContact"
          required
          value={finderContact}
          onChange={(e) => setFinderContact(e.target.value)}
          className="w-full rounded-lg border border-[var(--skin-line)] bg-[var(--skin-surface)] px-3 py-2 text-sm text-[var(--skin-ink)]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          required
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. I found your bag at Dhaka airport, gate 3."
          className="w-full rounded-lg border border-[var(--skin-line)] bg-[var(--skin-surface)] px-3 py-2 text-sm text-[var(--skin-ink)]"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-xl bg-[var(--skin-accent)] px-4 py-3 font-semibold text-[var(--skin-on-accent)] transition-transform hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60 disabled:hover:scale-100"
      >
        {status === "sending" ? "Sending…" : "Send message to owner"}
      </button>
    </form>
  );
}
