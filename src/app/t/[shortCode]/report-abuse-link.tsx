"use client";

import { useState } from "react";

export function ReportAbuseLink({ shortCode }: { shortCode: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-black/40 hover:underline">
        Report this tag
      </button>
    );
  }

  if (status === "sent") {
    return <p className="text-xs text-emerald-700">Thanks, we&apos;ll review this.</p>;
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus("sending");
        await fetch("/api/abuse-reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shortCode, reason }),
        });
        setStatus("sent");
      }}
      className="flex flex-col items-center gap-2"
    >
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        required
        className="rounded-md border border-black/15 px-2 py-1 text-xs"
      >
        <option value="">Select a reason…</option>
        <option value="spam">Spam or scam</option>
        <option value="inappropriate">Inappropriate content</option>
        <option value="stolen">Suspected stolen item</option>
        <option value="other">Other</option>
      </select>
      <button
        type="submit"
        disabled={status === "sending" || !reason}
        className="text-xs text-red-600 hover:underline disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : "Submit report"}
      </button>
    </form>
  );
}
