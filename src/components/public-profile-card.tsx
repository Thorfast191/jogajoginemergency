import type { PublicProfileView } from "@/lib/public-profile";
import { RelayForm } from "@/app/t/[shortCode]/relay-form";

// Presentational only. Every visible field has already been vetted by
// buildPublicProfileView — this component must not receive a raw profile.
export function PublicProfileCard({
  view,
  shortCode,
}: {
  view: PublicProfileView;
  shortCode: string;
}) {
  const medical: Array<[string, string | null]> = [
    ["Blood group", view.bloodGroup],
    ["Allergies", view.allergies],
    ["Medical notes", view.medicalNotes],
  ];
  const hasMedical = medical.some(([, v]) => v);

  return (
    <div>
      {view.lost && (
        <div className="mb-4 rounded-md bg-amber-100 text-amber-800 text-sm px-3 py-2 text-center font-medium">
          The owner has marked this as lost — thank you for helping return it!
        </div>
      )}

      <div className="text-center">
        {view.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={view.photoUrl}
            alt=""
            className="w-24 h-24 rounded-full object-cover mx-auto mb-3"
          />
        )}
        <h1 className="text-xl font-semibold">{view.displayName}</h1>
      </div>

      <p className="mt-4 text-center text-xs font-medium uppercase tracking-wide text-black/40">
        Emergency information
      </p>

      {view.emergencyMessage && (
        <p className="mt-2 text-sm text-black/70 text-center">{view.emergencyMessage}</p>
      )}

      {hasMedical && (
        <dl className="mt-4 rounded-lg border border-black/10 divide-y divide-black/10 text-sm">
          {medical.map(([label, value]) =>
            value ? (
              <div key={label} className="flex justify-between gap-3 px-3 py-2">
                <dt className="text-black/50">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ) : null,
          )}
        </dl>
      )}

      <div className="mt-6">
        {view.contactMode === "DIRECT_CALL" && view.phonePublic ? (
          <a
            href={`tel:${view.phonePublic}`}
            className="block w-full rounded-md bg-emerald-600 text-white text-center px-4 py-3 font-medium hover:bg-emerald-700"
          >
            Call to return this
          </a>
        ) : (
          <RelayForm shortCode={shortCode} />
        )}
      </div>

      {view.contacts.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-black/40">
            Emergency contacts
          </p>
          <ul className="mt-2 space-y-2">
            {view.contacts.map((c, i) => (
              <li key={i} className="rounded-lg border border-black/10 px-3 py-2 text-sm">
                <p className="font-medium">
                  {c.name}
                  {c.relation ? <span className="text-black/50"> · {c.relation}</span> : null}
                </p>
                <div className="mt-1 flex gap-3 text-xs">
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="text-emerald-700 hover:underline">
                      Call {c.phone}
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="text-emerald-700 hover:underline">
                      Email
                    </a>
                  )}
                </div>
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
