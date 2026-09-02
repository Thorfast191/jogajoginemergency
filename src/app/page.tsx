import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { GetYourTagButton } from "@/components/get-your-tag-button";
import { MascotWave } from "@/components/illustrations";

const steps = [
  {
    title: "1. Get your sticker",
    body: "Pick a QR sticker for your bike, bag, helmet, or car. One-time purchase — we ship you a unique tag linked to your account.",
  },
  {
    title: "2. Lost item gets found",
    body: "Anyone who finds it scans the QR code with their phone camera — no app, no login required.",
  },
  {
    title: "3. You get reconnected",
    body: "The finder sees only what you chose to share, and can message you through a masked relay. Your number stays private.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteNav />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-20 sm:py-28 text-center">
          <MascotWave className="w-24 h-24 mx-auto text-emerald-600 anim-float" />
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight text-balance">
            Lost items find their way home.
          </h1>
          <p className="mt-5 text-lg text-black/60 max-w-2xl mx-auto text-balance">
            Jogajog Emergency puts a scannable QR sticker on everything that matters — bags,
            bikes, laptops, cars — so a stranger can reach you the moment it&apos;s found,
            without ever seeing your phone number.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <GetYourTagButton>Get your tag</GetYourTagButton>
            <Link
              href="/shop"
              className="rounded-md border border-black/15 px-6 py-3 font-medium hover:bg-black/5"
            >
              Browse stickers
            </Link>
          </div>
        </section>

        <section className="border-t border-black/10 bg-black/[0.02]">
          <div className="mx-auto max-w-6xl px-4 py-16 grid sm:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.title}>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-black/60">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold text-center">Built to protect your privacy</h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-6">
            <div className="rounded-lg border border-black/10 p-6">
              <h3 className="font-medium">No number ever shown</h3>
              <p className="mt-2 text-sm text-black/60">
                Finders message you through a masked relay by default — your real phone number
                and email are never displayed on the public scan page.
              </p>
            </div>
            <div className="rounded-lg border border-black/10 p-6">
              <h3 className="font-medium">You control what&apos;s public</h3>
              <p className="mt-2 text-sm text-black/60">
                Choose a display name, a custom message, and whether to expose a masked
                click-to-call number instead of the relay form.
              </p>
            </div>
            <div className="rounded-lg border border-black/10 p-6">
              <h3 className="font-medium">Scan notifications</h3>
              <p className="mt-2 text-sm text-black/60">
                Get notified the moment your tag is scanned, with the time and an approximate
                location — so you know your item is being handled.
              </p>
            </div>
            <div className="rounded-lg border border-black/10 p-6">
              <h3 className="font-medium">Mark items lost instantly</h3>
              <p className="mt-2 text-sm text-black/60">
                Flip a tag to &quot;lost&quot; from your dashboard to change what&apos;s shown to
                finders, or deactivate it entirely if it&apos;s recovered another way.
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
