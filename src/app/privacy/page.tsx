import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ContentSection } from "@/components/content-page";

export const metadata: Metadata = {
  title: "Privacy — Jogajog Emergency",
  description: "What Jogajog Emergency collects, what a scan page shows, and what we never do.",
};

export default function PrivacyPage() {
  return (
    <ContentPage
      eyebrow="Privacy"
      title="Your information, on your terms."
      intro="A plain-language account of what we collect, what a stranger can see, and what we never do with it."
    >
      <ContentSection title="What a scan page shows">
        <p>
          Only the fields you switched on in your privacy settings, and only while your plan is
          active. Each field — name, photo, blood group, allergies, medical notes, contacts, bio,
          links — has its own switch. Without an active plan, the page shows none of your
          information; a finder can still send you a message.
        </p>
        <p>
          Your account email and phone number are never shown on a scan page. Finders reach you
          through a relay, unless you choose to publish a number for click-to-call.
        </p>
        <p>Scan pages are hidden from search engines.</p>
      </ContentSection>

      <ContentSection title="What we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>Your account details: name, email, optional phone, and a securely hashed password.</li>
          <li>The emergency profile you fill in, and your privacy choices.</li>
          <li>Orders and shipping details, so we can print and deliver your stickers.</li>
          <li>
            Payment records. Card and mobile-wallet details are handled by the payment provider
            (bKash, Nagad or SSLCommerz); we never see or store them.
          </li>
          <li>
            When a tag is scanned: the time, an approximate city where available, the device type,
            and a salted, one-way hash of the scanner&apos;s IP address. We never store the IP
            address itself.
          </li>
          <li>Messages a finder sends you, and the contact they leave for your reply.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Cookies">
        <p>
          We use one cookie to keep you signed in and one to remember your cart. No advertising or
          tracking cookies.
        </p>
      </ContentSection>

      <ContentSection title="Emails we send">
        <p>
          Scan alerts (which you can turn off), messages from finders, password resets, reminders
          to generate your QR codes, and notices before your plan ends. A record of each email is
          kept for 90 days so failed deliveries can be spotted.
        </p>
      </ContentSection>

      <ContentSection title="What we never do">
        <ul className="list-disc space-y-2 pl-5">
          <li>Sell or rent your information.</li>
          <li>Show your information to anyone you haven&apos;t chosen to show it to.</li>
          <li>Use your medical details for anything other than displaying them where you asked.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Your choices">
        <p>
          Change what is public, mark a tag lost, delete a QR code, or update your details at any
          time from your dashboard. To delete your account and its data, please{" "}
          <Link href="/contact" className="font-semibold text-[var(--color-primary)] hover:underline">
            contact us
          </Link>
          .
        </p>
      </ContentSection>
    </ContentPage>
  );
}
