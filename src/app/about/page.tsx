import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ContentSection } from "@/components/content-page";

export const metadata: Metadata = {
  title: "About — Jogajog Emergency",
  description: "Why Jogajog Emergency exists, and the principles it is built on.",
};

const PRINCIPLES = [
  ["Privacy first", "Your phone number and email never appear on a scan page unless you choose to show them. Finders reach you through a relay."],
  ["You decide", "Every field a finder can see has its own switch. Nothing is published because we thought it would be useful."],
  ["Readable in an emergency", "Whatever theme you pick, the page keeps its text readable — someone may be looking for your blood group on a cracked phone screen."],
  ["No app, no login", "A finder or first responder just points a phone camera at the sticker. It opens in the browser."],
];

export default function AboutPage() {
  return (
    <ContentPage
      eyebrow="About us"
      title="Lost things should find their way home."
      intro="Jogajog means connection. We make the small sticker that connects a found helmet, bag or bike with the person it belongs to — and, when it really matters, with the people who should be called."
    >
      <ContentSection title="Why we built it">
        <p>
          Every day, bags are left on buses, bikes go missing, and riders are helped by strangers
          who have no idea who to call. The information that would fix it — a name, a contact, a
          blood group — is locked in a phone nobody can open.
        </p>
        <p>
          A Jogajog Emergency sticker carries a QR code that opens a page you control. You decide
          what a stranger sees, and they can reach you without ever learning your number.
        </p>
      </ContentSection>

      <ContentSection title="How it works">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Buy a sticker in the theme you like — a one-time purchase.</li>
          <li>Generate your QR code in your dashboard. We print it into the centre of your sticker and ship it.</li>
          <li>Fill in your emergency profile and choose what is public. A plan publishes your page.</li>
          <li>Anyone who scans it sees what you shared and can message you through the relay.</li>
        </ol>
      </ContentSection>

      <ContentSection title="What we stand by">
        <div className="grid gap-4 sm:grid-cols-2">
          {PRINCIPLES.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-black/10 bg-white p-5">
              <p className="font-semibold text-black">{title}</p>
              <p className="mt-1 text-sm">{body}</p>
            </div>
          ))}
        </div>
      </ContentSection>

      <ContentSection title="Say hello">
        <p>
          Questions, partnerships, or bulk orders for a school, club or delivery fleet?{" "}
          <Link href="/contact" className="font-semibold text-[var(--color-primary)] hover:underline">
            Get in touch
          </Link>
          .
        </p>
      </ContentSection>
    </ContentPage>
  );
}
