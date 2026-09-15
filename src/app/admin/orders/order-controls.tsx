"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateOrderStatusAction,
  updateFulfillmentAction,
  issueReplacementTagAction,
} from "./actions";

const ORDER_STATUSES = ["PENDING", "PAID", "CANCELLED", "REFUNDED"];
const FULFILLMENT = ["UNFULFILLED", "PROCESSING", "SHIPPED", "DELIVERED"];

export function OrderControls({
  orderId,
  status,
  fulfillmentStatus,
  canChangeStatus,
}: {
  orderId: string;
  status: string;
  fulfillmentStatus: string;
  /** Payment status is money — only super admins get the select. */
  canChangeStatus: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const run = (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium mb-1">Order status</label>
        {canChangeStatus ? (
          <select
            value={status}
            disabled={pending}
            onChange={(e) => run(() => updateOrderStatusAction(orderId, e.target.value))}
            className="rounded-md border border-black/15 px-2 py-1 text-sm"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm font-semibold">{status}</p>
        )}
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Fulfilment</label>
        <select
          value={fulfillmentStatus}
          disabled={pending}
          onChange={(e) => run(() => updateFulfillmentAction(orderId, e.target.value))}
          className="rounded-md border border-black/15 px-2 py-1 text-sm"
        >
          {FULFILLMENT.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function ReplacementButton({ orderItemId }: { orderItemId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="inline-flex flex-col">
      <button
        onClick={() =>
          start(async () => {
            const res = await issueReplacementTagAction(orderItemId);
            setMsg(res.error ?? "Replacement tag issued.");
            if (!res.error) router.refresh();
          })
        }
        disabled={pending}
        className="text-xs text-emerald-700 hover:underline disabled:opacity-60"
      >
        {pending ? "Issuing…" : "Issue replacement tag"}
      </button>
      {msg && <span className="text-[11px] text-black/50">{msg}</span>}
    </div>
  );
}
