import type { Bucket } from "@/lib/subscription-periods";

const LABEL: Record<Bucket, string> = {
  active: "Active",
  expiring: "Expiring soon",
  expired: "Expired",
  cancelled: "Cancelled",
};

const TONE: Record<Bucket, string> = {
  active: "bg-emerald-100 text-emerald-800",
  expiring: "bg-amber-100 text-amber-800",
  expired: "bg-black/10 text-black/60",
  cancelled: "bg-red-100 text-red-700",
};

export function BucketBadge({ bucket, complimentary }: { bucket: Bucket; complimentary?: boolean }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TONE[bucket]}`}>{LABEL[bucket]}</span>
      {complimentary && (
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
          Complimentary
        </span>
      )}
    </span>
  );
}

export const BUCKETS: { id: Bucket; label: string }[] = [
  { id: "active", label: LABEL.active },
  { id: "expiring", label: LABEL.expiring },
  { id: "expired", label: LABEL.expired },
  { id: "cancelled", label: LABEL.cancelled },
];
