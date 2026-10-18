import type { PublicProfileView } from "@/lib/public-profile";
import { RelayForm } from "@/app/t/[shortCode]/relay-form";
import { ThemeMascot } from "@/components/illustrations";

// Presentational only. Every visible field has already been vetted by
// buildPublicProfileView — this component must not receive a raw profile.
//
// A theme recolours this card, but never at the cost of reading it. Every
// colour here comes from the --skin-* tokens, which themeCssVars has already
// forced to meet WCAG contrast against the card's own surface. Someone may be
// reading this on a stranger's phone to find a blood group: legibility is not
// negotiable, whatever the skin says.
/** What the demo shows where a real page has its message form. */
function DemoRelay() {
  return (
    <div className="rounded-xl border border-dashed border-[var(--skin-line)] p-4 text-center text-sm">
      <p className="font-semibold">Message the owner</p>
      <p className="mt-1 text-[var(--skin-muted)]">
        On a real sticker, you pick a reason or type a message here. It reaches the owner in their
        dashboard and by email, and their number is never shown.
      </p>
    </div>
  );
}

export function PublicProfileCard({
  view,
  shortCode,
  mascot,
  demo = false,
}: {
  view: PublicProfileView;
  shortCode: string;
  mascot?: string;
  /**
   * Sample data, or the owner's own preview: no working relay, no dialable
   * numbers. A live form there would post to a code that doesn't exist.
   */
  demo?: boolean;
}) {
  const relay = demo ? <DemoRelay /> : <RelayForm shortCode={shortCode} />;
  const medical: Array<[string, string | null]> = [
    ["Blood group", view.bloodGroup],
    ["Allergies", view.allergies],
    ["Medical notes", view.medicalNotes],
  ];
  const hasMedical = medical.some(([, v]) => v);

  // Dormant: the owner has no active subscription, so nothing about them is
  // shown. The relay stays open so a found item can still be returned — see
  // LAPSED_BEHAVIOUR in src/lib/entitlements.ts.
  if (!view.active) {
    return (
      <div className="text-[var(--skin-ink)]">
        <div className="text-center">
          <ThemeMascot
            mascot={mascot}
            className="mx-auto mb-2 h-20 w-20 text-[var(--skin-accent)]"
          />
          <h1 className="text-lg font-bold">Someone&apos;s belongings</h1>
          <p className="mt-2 text-sm text-[var(--skin-muted)]">
            {view.relayOpen
              ? "This tag's details aren't published right now. If anyone is hurt, call 999. You can still send its owner a message below."
              : "This tag isn't active right now."}
          </p>
        </div>
        {view.relayOpen && <div className="mt-6">{relay}</div>}
      </div>
    );
  }

  const hasEmergency = Boolean(view.emergencyMessage) || hasMedical || view.contacts.length > 0;

  return (
    <div className="text-[var(--skin-ink)]">
      <div className="text-center">
        {view.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={view.photoUrl}
            alt=""
            className="w-24 h-24 rounded-full object-cover mx-auto mb-3 ring-4 ring-[var(--skin-accent)]/20"
          />
        ) : (
          <ThemeMascot mascot={mascot} className="mx-auto mb-2 h-20 w-20 text-[var(--skin-accent)]" />
        )}
        <h1 className="text-xl font-bold">{view.displayName}</h1>
        {view.bio && <p className="mt-1 text-sm text-[var(--skin-muted)]">{view.bio}</p>}
      </div>

      {/* Two separate paths. Someone standing over an injured rider and someone
          whose gate is blocked need different things, and each should find
          theirs without reading the other. */}
      <nav aria-label="What do you need?" className="mt-5 grid grid-cols-2 gap-2 text-sm font-semibold">
        <a
          href="#emergency"
          className="rounded-xl border-2 border-[#B91C1C] px-3 py-3 text-center text-[#B91C1C] hover:bg-[#B91C1C]/5"
        >
          Emergency
          <span className="block text-xs font-normal">Someone is hurt</span>
        </a>
        <a
          href="#contact"
          className="rounded-xl border-2 border-[var(--skin-accent)] px-3 py-3 text-center text-[var(--skin-ink)] hover:bg-[var(--skin-accent)]/5"
        >
          Contact the owner
          <span className="block text-xs font-normal text-[var(--skin-muted)]">Vehicle or item needs attention</span>
        </a>
      </nav>

      <section id="emergency" aria-labelledby="emergency-heading" className="mt-6 scroll-mt-4">
        <h2 id="emergency-heading" className="text-center text-xs font-semibold uppercase tracking-wide text-[var(--skin-muted)]">
          Emergency information
        </h2>

        {view.emergencyMessage && (
          <p className="mt-2 text-center text-sm text-[var(--skin-ink)]">{view.emergencyMessage}</p>
        )}

        {view.contacts.length > 0 && (
          <ul className="mt-4 space-y-2" aria-label="Emergency contacts">
            {view.contacts.map((c, i) => (
              <li key={i} className="rounded-xl border border-[var(--skin-line)] px-3 py-2 text-sm">
                <p className="font-semibold">
                  {c.name}
                  {c.relation ? <span className="font-normal text-[var(--skin-muted)]"> · {c.relation}</span> : null}
                </p>
                <div className="mt-1 flex gap-3 text-xs">
                  {c.phone &&
                    (demo ? (
                      <span className="text-[var(--skin-accent)]">Call {c.phone}</span>
                    ) : (
                      <a href={`tel:${c.phone}`} className="font-semibold text-[var(--skin-accent)] hover:underline">
                        Call {c.phone}
                      </a>
                    ))}
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="text-[var(--skin-accent)] hover:underline">
                      Email
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {hasMedical && (
          <>
            <dl className="mt-4 rounded-xl border border-[var(--skin-line)] divide-y divide-[var(--skin-line)] text-sm">
              {medical.map(([label, value]) =>
                value ? (
                  <div key={label} className="flex justify-between gap-3 px-3 py-2">
                    <dt className="text-[var(--skin-muted)]">{label}</dt>
                    <dd className="text-right font-semibold">{value}</dd>
                  </div>
                ) : null,
              )}
            </dl>
            <p className="mt-2 text-xs text-[var(--skin-muted)]">
              Entered by the owner and not medically verified. Don&apos;t use it alone for treatment or
              transfusion decisions.
            </p>
          </>
        )}

        {!hasEmergency && (
          <p className="mt-2 text-center text-sm text-[var(--skin-muted)]">
            The owner hasn&apos;t shared emergency details. Call 999 if anyone is hurt, or send the
            owner a message below.
          </p>
        )}
      </section>

      <section id="contact" aria-labelledby="contact-heading" className="mt-6 scroll-mt-4">
        <h2 id="contact-heading" className="text-center text-xs font-semibold uppercase tracking-wide text-[var(--skin-muted)]">
          Contact the owner
        </h2>
        {view.lost && (
          <div className="mt-2 rounded-lg bg-amber-100 text-amber-900 text-sm px-3 py-2 text-center font-medium">
            The owner has marked this as lost. Thank you for helping return it!
          </div>
        )}
        <div className="mt-3">
          {view.contactMode === "DIRECT_CALL" && view.phonePublic ? (
            <a
              href={`tel:${view.phonePublic}`}
              className="block w-full rounded-xl bg-[var(--skin-accent)] text-white text-center px-4 py-3 font-semibold transition-transform hover:scale-[1.02] active:scale-[0.99]"
            >
              Call the owner
            </a>
          ) : (
            relay
          )}
        </div>
      </section>

      {view.links.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--skin-muted)]">Links</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {view.links.map((l, i) => (
              <li key={i}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-block rounded-full border border-[var(--skin-line)] px-3 py-1 text-xs font-medium hover:border-[var(--skin-accent)] hover:text-[var(--skin-accent)]"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-[var(--skin-muted)]">
        The owner&apos;s account details are never shown unless they chose to share them.
      </p>
    </div>
  );
}
