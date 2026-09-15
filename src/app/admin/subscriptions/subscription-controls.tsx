"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelSubscriptionNowAction,
  extendSubscriptionAction,
  grantComplimentaryAction,
  type SubscriptionActionState,
} from "./actions";

const initial: SubscriptionActionState = {};
const field = "rounded-lg border border-black/15 bg-white px-3 py-2 text-sm";

function Months({ name = "months" }: { name?: string }) {
  return (
    <select name={name} defaultValue="1" className={field} aria-label="Months">
      <option value="1">1 month</option>
      <option value="3">3 months</option>
      <option value="6">6 months</option>
      <option value="12">12 months</option>
    </select>
  );
}

function Result({ state }: { state: SubscriptionActionState }) {
  if (state.error) return <p className="mt-2 text-sm text-red-600">{state.error}</p>;
  if (state.ok) return <p className="mt-2 text-sm text-[var(--color-primary-dark)]">{state.ok}</p>;
  return null;
}

export function ExtendForm({ subscriptionId }: { subscriptionId: string }) {
  const [state, action, pending] = useActionState(
    extendSubscriptionAction.bind(null, subscriptionId),
    initial,
  );
  return (
    <form action={action}>
      <div className="flex flex-wrap gap-2">
        <Months />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Extending…" : "Extend"}
        </button>
      </div>
      <Result state={state} />
    </form>
  );
}

export function GrantForm({ userId, plans }: { userId: string; plans: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(grantComplimentaryAction.bind(null, userId), initial);
  return (
    <form action={action}>
      <div className="flex flex-wrap gap-2">
        <select name="planId" required className={field} aria-label="Plan" defaultValue={plans[0]?.id}>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Months />
        <button
          type="submit"
          disabled={pending || plans.length === 0}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Granting…" : "Grant free time"}
        </button>
      </div>
      <Result state={state} />
    </form>
  );
}

export function CancelNowButton({ subscriptionId }: { subscriptionId: string }) {
  const [pending, start] = useTransition();
  const [armed, setArmed] = useState(false);
  const [state, setState] = useState<SubscriptionActionState>({});
  const router = useRouter();

  return (
    <div>
      {armed ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-red-700">Unpublish their page now?</span>
          <button
            disabled={pending}
            onClick={() =>
              start(async () => {
                setState(await cancelSubscriptionNowAction(subscriptionId));
                setArmed(false);
                router.refresh();
              })
            }
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Cancelling…" : "Yes, cancel now"}
          </button>
          <button onClick={() => setArmed(false)} className="text-sm text-black/50 hover:underline">
            Keep it
          </button>
        </div>
      ) : (
        <button
          onClick={() => setArmed(true)}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          Cancel immediately
        </button>
      )}
      <Result state={state} />
    </div>
  );
}
