import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ContentSection } from "@/components/content-page";

export const metadata: Metadata = {
  title: "Terms — Jogajog Emergency",
  description: "The terms for buying stickers and using Jogajog Emergency.",
};

export default function TermsPage() {
  return (
    <ContentPage
      eyebrow="Terms"
      title="The short version of the rules."
      intro="By buying a sticker or creating an account, you agree to these terms."
    >
      <ContentSection title="Not an emergency service">
        <p>
          Jogajog Emergency helps a stranger reach you and see the information you chose to share.
          It does not contact emergency services, and we can&apos;t guarantee that anyone will scan
          a sticker. In an emergency in Bangladesh, call <strong>999</strong>.
        </p>
      </ContentSection>

      <ContentSection title="Stickers">
        <ul className="list-disc space-y-2 pl-5">
          <li>Stickers are a one-time purchase. Each comes with the QR codes listed on its page.</li>
          <li>
            You generate your QR codes in your dashboard. We print each sticker with its QR code in
            the centre and ship it once your codes are generated.
          </li>
          <li>
            A sticker&apos;s theme is yours to use on any of your tags. Deleting a QR code frees
            its slot so you can generate another.
          </li>
          <li>If a sticker arrives damaged, contact us and we&apos;ll issue a replacement code.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Plans">
        <ul className="list-disc space-y-2 pl-5">
          <li>A plan publishes your scan pages for the period you paid for.</li>
          <li>
            Plans don&apos;t renew automatically. We&apos;ll email you before yours ends, and you
            can renew any time — early renewals are added to the end of your current period.
          </li>
          <li>
            If you cancel, your page stays published until the end of the period you paid for.
          </li>
          <li>
            Without an active plan, scanning your sticker shows none of your information, but a
            finder can still send you a message.
          </li>
        </ul>
      </ContentSection>

      <ContentSection title="Using Jogajog responsibly">
        <p>
          Only publish information that is yours to share, and don&apos;t use a scan page to
          mislead, harass or advertise. We may take down a QR code or suspend an account that is
          misused. Anyone can report a scan page from the link at its bottom.
        </p>
      </ContentSection>

      <ContentSection title="Questions">
        <p>
          <Link href="/contact" className="font-semibold text-[var(--color-primary)] hover:underline">
            Contact us
          </Link>{" "}
          — we&apos;re happy to explain anything here.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
