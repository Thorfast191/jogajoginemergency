import type { PublicProfileView } from "@/lib/public-profile";
import { RelayForm } from "@/app/t/[shortCode]/relay-form";
import { ThemeMascot } from "@/components/illustrations";

// Presentational only. Every visible field has already been vetted by
// buildPublicProfileView — this component must not receive a raw profile.
//
// A theme may recolour the frame around this card, but the emergency block
// below keeps fixed high-contrast colours. Someone is reading this on a
// stranger's phone, possibly in a hurry: legibility is not themeable.
export function PublicProfileCard({
  view,
  shortCode,
  mascot,
}: {
  view: PublicProfileView;
  shortCode: string;
  mascot?: string;
}) {
  const medical: Array<[string, string | null]> = [
    ["Blood group", view.bloodGroup],
    ["Allergies", view.allergies],
    ["Medical notes", view.medicalNotes],
  ];
  const hasMedical = medical.some(([, v]) => v);

  return (
    <div className="text-black">
      {view.lost && (
        <div className="mb-4 rounded-lg bg-amber-100 text-amber-900 text-sm px-3 py-2 text-center font-medium">
          The owner has marked this as lost — thank you for helping return it!
        </div>
      )}

      <div className="text-center">
        {view.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={view.photoUrl}
            alt=""
            className="w-24 h-24 rounded-full object-cover mx-auto mb-3 ring-4 ring-[var(--skin-accent)]/20"
          />
        ) : (
          <ThemeMascot mascot={mascot} className="w-20 h-20 mx-auto mb-2" />
        )}
        <h1 className="text-xl font-bold">{view.displayName}</h1>
        {view.bio && <p className="mt-1 text-sm text-black/60">{view.bio}</p>}
      </div>

      <p className="mt-5 text-center text-xs font-semibold uppercase tracking-wide text-black/40">
        Emergency information
      </p>

      {view.emergencyMessage && (
        <p className="mt-2 text-center text-sm text-black/70">{view.emergencyMessage}</p>
      )}

      {hasMedical && (
        <dl className="mt-4 rounded-xl border border-black/10 divide-y divide-black/10 text-sm">
          {medical.map(([label, value]) =>
            value ? (
              <div key={label} className="flex justify-between gap-3 px-3 py-2">
                <dt className="text-black/50">{label}</dt>
                <dd className="text-right font-semibold">{value}</dd>
              </div>
            ) : null,
          )}
        </dl>
      )}

      <div className="mt-6">
        {view.contactMode === "DIRECT_CALL" && view.phonePublic ? (
          <a
            href={`tel:${view.phonePublic}`}
            className="block w-full rounded-xl bg-[var(--skin-accent)] text-white text-center px-4 py-3 font-semibold transition-transform hover:scale-[1.02] active:scale-[0.99]"
          >
            Call to return this
          </a>
        ) : (
          <RelayForm shortCode={shortCode} />
        )}
      </div>

      {view.contacts.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
            Emergency contacts
          </p>
          <ul className="mt-2 space-y-2">
            {view.contacts.map((c, i) => (
              <li key={i} className="rounded-xl border border-black/10 px-3 py-2 text-sm">
                <p className="font-semibold">
                  {c.name}
                  {c.relation ? <span className="font-normal text-black/50"> · {c.relation}</span> : null}
                </p>
                <div className="mt-1 flex gap-3 text-xs">
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="text-[var(--skin-accent)] hover:underline">
                      Call {c.phone}
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="text-[var(--skin-accent)] hover:underline">
                      Email
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {view.links.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-black/40">Links</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {view.links.map((l, i) => (
              <li key={i}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-block rounded-full border border-black/15 px-3 py-1 text-xs font-medium hover:border-[var(--skin-accent)] hover:text-[var(--skin-accent)]"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-black/40">
        The owner&apos;s account details are never shown unless they chose to share them.
      </p>
    </div>
  );
}
