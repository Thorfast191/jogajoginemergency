import type { Metadata } from "next";
import { clientHref } from "@/lib/hosts";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { ContentPage, ContentSection } from "@/components/content-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact — Jogajog Emergency",
  description: "How to reach the Jogajog Emergency team.",
};

export default async function ContactPage() {
  const s = await getSettings();
  const channels = [
    s.supportEmail && { label: "Email", value: s.supportEmail, href: `mailto:${s.supportEmail}` },
    s.supportPhone && { label: "Phone", value: s.supportPhone, href: `tel:${s.supportPhone.replace(/\s+/g, "")}` },
    s.whatsappUrl && { label: "WhatsApp", value: "Message us on WhatsApp", href: s.whatsappUrl },
    s.facebookUrl && { label: "Facebook", value: "Our Facebook page", href: s.facebookUrl },
  ].filter((c): c is { label: string; value: string; href: string } => Boolean(c));

  return (
    <ContentPage
      eyebrow="Contact"
      title="We're here to help."
      intro="Order questions, a sticker that arrived damaged, or something on a scan page that shouldn't be there — tell us."
    >
      <ContentSection title="Reach the team">
        {channels.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {channels.map((c) => (
              <a
                key={c.label}
                href={c.href}
                target={c.href.startsWith("http") ? "_blank" : undefined}
                rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="rounded-2xl border border-black/10 bg-white p-5 hover-lift"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-black/40">{c.label}</p>
                <p className="mt-1 font-semibold text-black">{c.value}</p>
              </a>
            ))}
          </div>
        ) : (
          <p>Contact details are being set up. Please check back soon.</p>
        )}
        {s.address && <p className="text-sm text-black/50">{s.address}</p>}
      </ContentSection>

      <ContentSection title="Already a customer?">
        <p>
          Most things can be done from your{" "}
          <Link href={clientHref("/dashboard")} className="font-semibold text-[var(--color-primary)] hover:underline">
            dashboard
          </Link>
          : generate and download QR codes, mark a tag lost, change what finders see, or manage
          your plan.
        </p>
      </ContentSection>

      <ContentSection title="Reporting a scan page">
        <p>
          Every scan page has a <strong>Report</strong> link at the bottom. Use it if a page is
          being misused — reports go straight to our moderation queue, and we can take a code down.
        </p>
      </ContentSection>

      <ContentSection title="In an emergency">
        <p>
          Jogajog Emergency is not an emergency service. If someone is hurt, call <strong>999</strong>{" "}
          first, then use the information on their sticker.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
