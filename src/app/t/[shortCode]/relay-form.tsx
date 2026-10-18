"use client";

import { useState } from "react";

// One tap for the common cases, so a stranger in a hurry doesn't have to
// compose a message. Each one is just a starting text they can still edit.
const REASONS = [
  "You may be blocking access. Please move your vehicle.",
  "Please check your parking.",
  "There may be a minor incident with your vehicle.",
  "I've found something of yours.",
];

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

  // Only shown once the server has saved the message. It says what we know —
  // the message is waiting for the owner — and not what we don't: that they
  // have read it, or will reply.
  if (status === "sent") {
    return (
      <div role="status" className="text-sm text-emerald-800 text-center bg-emerald-50 rounded-md px-3 py-3">
        <p className="font-semibold">Message saved for the owner</p>
        <p className="mt-1">
          It&apos;s waiting in their Jogajog account and we&apos;ve tried to email them. We can&apos;t
          tell when they&apos;ll read it. If anyone is hurt, call 999.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <fieldset>
        <legend className="block text-sm font-medium mb-1">Pick a reason</legend>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setMessage(r)}
              aria-pressed={message === r}
              className={`rounded-full border px-3 py-1.5 text-left text-xs ${
                message === r
                  ? "border-[var(--skin-accent)] bg-[var(--skin-accent)]/10 font-semibold"
                  : "border-[var(--skin-line)]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </fieldset>
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
          Message (or write your own)
        </label>
        <textarea
          id="message"
          required
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. Your car is blocking the gate at house 12."
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
