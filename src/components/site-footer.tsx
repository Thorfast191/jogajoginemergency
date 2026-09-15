import Link from "next/link";
import { getSettings } from "@/lib/settings";

const COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { href: "/shop", label: "Stickers" },
      { href: "/themes", label: "Themes" },
      { href: "/#pricing", label: "Pricing" },
      { href: "/demo", label: "Live demo" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

// Kept out of the component body so the render stays free of impure calls.
function thisYear(): number {
  return new Date().getFullYear();
}

export async function SiteFooter() {
  const settings = await getSettings();
  const contact = [settings.supportEmail, settings.supportPhone].filter(Boolean);

  return (
    <footer className="mt-auto border-t border-black/10 bg-white/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="text-lg font-bold tracking-tight">
            Jogajog <span className="text-[var(--color-primary)]">Emergency</span>
          </p>
          <p className="mt-2 max-w-xs text-sm text-black/60">
            QR stickers that get lost things home — and get the right people called when it
            matters most.
          </p>
          {contact.length > 0 && (
            <p className="mt-4 text-sm text-black/70">{contact.join(" · ")}</p>
          )}
          {settings.address && <p className="mt-1 text-sm text-black/50">{settings.address}</p>}
          {(settings.facebookUrl || settings.whatsappUrl) && (
            <p className="mt-3 flex gap-3 text-sm font-medium">
              {settings.facebookUrl && (
                <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-primary)]">
                  Facebook
                </a>
              )}
              {settings.whatsappUrl && (
                <a href={settings.whatsappUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-primary)]">
                  WhatsApp
                </a>
              )}
            </p>
          )}
        </div>

        {COLUMNS.map((col) => (
          <div key={col.heading}>
            <p className="text-xs font-semibold uppercase tracking-wider text-black/40">{col.heading}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-black/70 hover:text-[var(--color-primary)]">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-black/5">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 px-4 py-5 text-xs text-black/50 sm:flex-row">
          <p>© {thisYear()} Jogajog Emergency. All rights reserved.</p>
          <p>In a medical emergency in Bangladesh, call 999 first.</p>
        </div>
      </div>
    </footer>
  );
}
