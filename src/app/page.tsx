import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ButtonLinkClass } from "@/components/ui";
import { MascotWave, MascotSearch, MascotShield, MascotCheer } from "@/components/illustrations";

const steps = [
  {
    icon: MascotWave,
    title: "Get your sticker",
    body: "Pick a sticker for your bike, bag, helmet or car — in whichever theme you like. One-time purchase, shipped to you.",
  },
  {
    icon: MascotSearch,
    title: "Someone finds it",
    body: "They scan the QR with a phone camera. No app, no login, nothing to install — it just opens.",
  },
  {
    icon: MascotCheer,
    title: "You get reconnected",
    body: "They see exactly what you chose to share, and can message you through a relay. Your number stays yours.",
  },
];

const promises = [
  {
    title: "Your number is never shown",
    body: "Finders reach you through a masked relay by default. Your real phone and email never appear on the scan page.",
    tone: "text-[var(--color-primary)]",
  },
  {
    title: "You choose every field",
    body: "Name, photo, blood group, allergies, contacts — each one is a switch. Presets get you started in a tap.",
    tone: "text-[var(--color-sky)]",
  },
  {
    title: "You generate the code",
    body: "Your QR is made in your own dashboard and bound to your profile — nobody printed it before you decided what it says.",
    tone: "text-[var(--color-berry)]",
  },
  {
    title: "Mark it lost in one tap",
    body: "Flip a tag to lost to change what finders see, or deactivate it entirely once the item is back.",
    tone: "text-[var(--color-grape)]",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        <section className="bg-wash">
          <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:py-28">
            <MascotWave className="mx-auto h-28 w-28 text-[var(--color-primary)] anim-float" />
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance sm:text-6xl">
              Lost things find their way home.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-black/60 text-balance">
              A scannable QR sticker for everything that matters — bags, bikes, helmets, cars — so a
              stranger can reach you the moment it&apos;s found, without ever seeing your number.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/shop" className={ButtonLinkClass()}>
                Get your tag
              </Link>
              <Link
                href="/themes"
                className="rounded-xl border border-black/15 px-6 py-3 font-semibold hover:bg-black/5"
              >
                Browse themes
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-black/10">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:grid-cols-3 anim-stagger">
            {steps.map(({ icon: Icon, title, body }, i) => (
              <div key={title} className="text-center sm:text-left">
                <Icon className="mx-auto h-16 w-16 text-[var(--color-primary)] sm:mx-0 anim-bob" />
                <h3 className="mt-3 font-bold">
                  <span className="text-[var(--color-accent)]">{i + 1}.</span> {title}
                </h3>
                <p className="mt-2 text-sm text-black/60">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-black/10 bg-black/[0.02]">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <div className="text-center">
              <MascotShield className="mx-auto h-16 w-16 text-[var(--color-primary)]" />
              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">Built to protect your privacy</h2>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 anim-stagger">
              {promises.map((p) => (
                <div
                  key={p.title}
                  className="rounded-2xl border border-black/10 bg-white p-6 hover-lift"
                >
                  <h3 className={`font-bold ${p.tone}`}>{p.title}</h3>
                  <p className="mt-2 text-sm text-black/60">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
