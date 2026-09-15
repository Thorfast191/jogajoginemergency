import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { intervalLabel } from "@/lib/subscription-periods";
import { DEFAULT_THEME_SLUG } from "@/lib/theme-access";
import type { ThemeSkin } from "@/lib/themes";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ButtonLinkClass } from "@/components/ui";
import { Reveal } from "@/components/reveal";
import { DemoPhone } from "@/components/demo-phone";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { Icon, type IconName } from "@/components/icons";
import { MascotCheer, MascotWave } from "@/components/illustrations";

export const dynamic = "force-dynamic";

const STEPS: { icon: IconName; title: string; body: string }[] = [
  { icon: "cart", title: "Pick a sticker", body: "For your bike, helmet, bag or car, in the theme you like. A one-time purchase." },
  { icon: "qr", title: "Generate your QR", body: "Make it in your dashboard. We print it into the empty square in the middle of your sticker." },
  { icon: "box", title: "Stick it on", body: "We ship it to you. Fill in what a finder should see — every field is your choice." },
  { icon: "activity", title: "Someone scans it", body: "No app needed. They see what you shared and can message you. You get an alert straight away." },
];

const PROMISES: { icon: IconName; title: string; body: string }[] = [
  { icon: "lock", title: "Your number is never shown", body: "Finders reach you through a relay. Your phone and email stay off the page unless you choose otherwise." },
  { icon: "user", title: "You choose every field", body: "Name, photo, blood group, allergies, contacts — each has its own switch, with one-tap presets." },
  { icon: "shield", title: "Readable in an emergency", body: "Whatever theme you pick, the page keeps its text legible. Scan pages are hidden from search engines." },
  { icon: "flag", title: "Lost? Flip one switch", body: "Mark a tag lost to tell finders it's missing, or deactivate it the moment you no longer need it." },
];

const USE_CASES = ["Bicycle", "Motorbike helmet", "School bag", "Suitcase", "Car dashboard", "Laptop", "Keys", "Pet collar", "Wheelchair", "Delivery box", "Camera bag", "Gym bag"];

const FAQ: [string, string][] = [
  ["Does the person who finds it need an app?", "No. Any phone camera opens the page in the browser — no app, no account, nothing to install."],
  ["What does a finder actually see?", "Only the fields you switched on — for example your first name, an emergency message and a contact. You can change it any time, and the change is live immediately."],
  ["Is my phone number shown?", "Not unless you choose to. By default finders send you a message through Jogajog, which reaches you by email while your number stays private."],
  ["Who prints the QR code onto the sticker?", "We do. Once you generate your QR in your dashboard, we print it into the centre of your sticker and ship it. You can also download the finished sticker as a PNG or PDF to reprint."],
  ["Why is there a plan as well as the sticker?", "The sticker is yours forever. The plan is what publishes your page. Without one, a scan shows none of your information — but finders can still send you a message, so a lost item can still come home."],
  ["Can I change my sticker's theme later?", "Yes. Every theme that came with a sticker you bought is yours to use on any of your QR codes, and everyone gets the Jogajog Emergency theme free."],
  ["How do I pay?", "With bKash, Nagad, or a card through SSLCommerz, depending on what's available at checkout."],
  ["Is this an emergency service?", "No. If someone is hurt, call 999 first. A Jogajog sticker helps the people around them find out who to call and what to know."],
];

export default async function Home() {
  const [themes, products, plan, tagCount, scanCount] = await Promise.all([
    prisma.theme
      .findMany({ where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } })
      .catch(() => []),
    prisma.product
      .findMany({ where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" }, take: 4, include: { theme: { select: { id: true, name: true } } } })
      .catch(() => []),
    prisma.subscriptionPlan
      .findFirst({ where: { isActive: true }, orderBy: { priceCents: "asc" } })
      .catch(() => null),
    prisma.tag.count().catch(() => 0),
    prisma.scanEvent.count().catch(() => 0),
  ]);

  const skins = themes as (ThemeSkin & { id: string })[];
  const heroTheme = skins.find((t) => t.slug === DEFAULT_THEME_SLUG) ?? skins[0] ?? null;
  const cheapest = products.reduce<number | null>((min, p) => (min === null || p.priceCents < min ? p.priceCents : min), null);

  // Live numbers once there are enough of them to mean something; until then,
  // facts about the product rather than a row of zeros.
  const stats =
    tagCount >= 25
      ? [
          { value: tagCount.toLocaleString(), label: "QR codes protecting belongings" },
          { value: scanCount.toLocaleString(), label: "scans answered" },
          { value: String(skins.length), label: "themes to choose from" },
          { value: "0", label: "apps a finder needs" },
        ]
      : [
          { value: "1 min", label: "to set up your page" },
          { value: "0", label: "apps a finder needs" },
          { value: String(Math.max(skins.length, 1)), label: "themes to choose from" },
          { value: "100%", label: "your choice what's shown" },
        ];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1 overflow-x-clip">
        {/* Hero */}
        <section className="relative bg-wash">
          <div className="bg-dots absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr]">
            <div className="text-center lg:text-left">
              <p className="anim-pop inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-semibold text-black/70">
                <span className="relative flex h-2 w-2">
                  <span className="anim-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary)]" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                </span>
                QR stickers for bikes, helmets, bags &amp; cars
              </p>
              <h1 className="anim-pop mt-5 text-4xl font-bold tracking-tight text-balance sm:text-6xl">
                Lost things find their <span className="text-[var(--color-primary)]">way home.</span>
              </h1>
              <p className="anim-pop mx-auto mt-5 max-w-xl text-lg text-black/60 text-balance lg:mx-0">
                A themed sticker with your own QR code in the middle. Whoever finds your things — or
                helps you after an accident — sees exactly what you chose to share, and can reach you
                without ever seeing your number.
              </p>
              <div className="anim-pop mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Link href="/shop" className={ButtonLinkClass()}>
                  Get your sticker
                </Link>
                <Link href="/demo" className="rounded-xl border border-black/15 bg-white/60 px-6 py-3 font-semibold hover:bg-white">
                  See a live demo
                </Link>
              </div>
              <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-black/60 lg:justify-start">
                {["No app needed", "Your number stays private", "Works on any phone"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Icon name="shield" width={16} height={16} className="text-[var(--color-primary)]" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative mx-auto w-full max-w-sm">
              <div className="anim-float relative rotate-[-4deg] rounded-[2rem] bg-white p-3 shadow-2xl ring-1 ring-black/5">
                {heroTheme ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/themes/${heroTheme.id}/preview`}
                    alt="A Jogajog Emergency sticker with a QR code printed in its centre"
                    className="w-full rounded-[1.5rem]"
                  />
                ) : (
                  <div className="grid aspect-square place-items-center rounded-[1.5rem] bg-[var(--background)]">
                    <MascotWave className="h-32 w-32 text-[var(--color-primary)]" />
                  </div>
                )}
                <div className="pointer-events-none absolute inset-x-[30%] top-0 bottom-0" aria-hidden>
                  <div className="anim-scan-line absolute inset-x-0 h-0.5 rounded-full bg-[var(--color-accent)] shadow-[0_0_14px_3px_rgb(255_138_91/0.6)]" />
                </div>
              </div>
              <div className="anim-bob absolute -bottom-6 -left-4 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-xl ring-1 ring-black/5 sm:-left-10">
                <span className="relative grid h-9 w-9 place-items-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <span className="anim-ping absolute inset-0 rounded-full bg-[var(--color-primary)]/30" />
                  <Icon name="activity" />
                </span>
                <span className="text-left text-xs">
                  <strong className="block text-sm">Your helmet was scanned</strong>
                  <span className="text-black/50">Just now · a message is waiting</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y border-black/5 bg-white/70">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 80} className="text-center">
                <p className="text-3xl font-bold text-[var(--color-primary-dark)] sm:text-4xl">{s.value}</p>
                <p className="mt-1 text-sm text-black/60">{s.label}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <Reveal className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">How it works</p>
              <h2 className="mt-2 text-3xl font-bold sm:text-4xl">From sticker to safe return in four steps</h2>
            </Reveal>
            <ol className="relative mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="absolute left-[12%] right-[12%] top-7 hidden border-t-2 border-dashed border-black/10 lg:block" aria-hidden />
              {STEPS.map((step, i) => (
                <Reveal key={step.title} delay={i * 120}>
                  <li className="relative text-center">
                    <span className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-[var(--color-primary)] shadow-md ring-1 ring-black/5 hover-wiggle">
                      <Icon name={step.icon} width={26} height={26} />
                      <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-[var(--color-accent)] text-xs font-bold text-white">
                        {i + 1}
                      </span>
                    </span>
                    <h3 className="mt-4 font-bold">{step.title}</h3>
                    <p className="mt-2 text-sm text-black/60">{step.body}</p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Live demo */}
        {skins.length > 0 && (
          <section id="demo" className="scroll-mt-20 border-t border-black/5 bg-[#f6f2ea]">
            <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 lg:grid-cols-2">
              <Reveal>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">Live demo</p>
                <h2 className="mt-2 text-3xl font-bold sm:text-4xl">This is what a finder sees</h2>
                <p className="mt-4 text-black/60">
                  The page opens in their browser in the theme of your sticker. Medical details,
                  contacts and a message only appear if you switched them on — and whatever the theme,
                  the text stays readable.
                </p>
                <ul className="mt-6 space-y-3 text-sm">
                  {[
                    "Emergency message, blood group and allergies up top",
                    "A message box that reaches you without your number",
                    "Contacts you chose, like a family member to call first",
                  ].map((t) => (
                    <li key={t} className="flex gap-3">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-[11px] font-bold text-white">✓</span>
                      {t}
                    </li>
                  ))}
                </ul>
                <Link href="/demo" className="mt-8 inline-block font-semibold text-[var(--color-primary-dark)] hover:underline">
                  Open the demo full screen →
                </Link>
              </Reveal>
              <Reveal delay={150}>
                <DemoPhone themes={skins} />
              </Reveal>
            </div>
          </section>
        )}

        {/* Stickers */}
        {products.length > 0 && (
          <section id="stickers" className="scroll-mt-20">
            <div className="mx-auto max-w-6xl px-4 py-20">
              <Reveal className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">Stickers</p>
                  <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Your QR, printed in the middle</h2>
                  <p className="mt-2 max-w-xl text-black/60">
                    Every design leaves a square in its centre for your own QR code. Pick the look;
                    the code is yours alone.
                  </p>
                </div>
                <Link href="/shop" className="font-semibold text-[var(--color-primary-dark)] hover:underline">
                  See all stickers →
                </Link>
              </Reveal>
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {products.map((p, i) => (
                  <Reveal key={p.id} delay={i * 90}>
                    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-white hover-lift">
                      <Link href={`/shop/${p.slug}`} className="block overflow-hidden bg-black/[0.03]">
                        {p.theme ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/themes/${p.theme.id}/preview`}
                            alt={`${p.name} in the ${p.theme.name} theme`}
                            loading="lazy"
                            className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          />
                        ) : p.imageAssetId ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/media/${p.imageAssetId}`} alt={p.name} loading="lazy" className="aspect-square w-full object-cover" />
                        ) : (
                          <div className="aspect-square w-full" />
                        )}
                      </Link>
                      <div className="flex flex-1 flex-col p-4">
                        <Link href={`/shop/${p.slug}`} className="font-bold hover:text-[var(--color-primary)]">
                          {p.name}
                        </Link>
                        <p className="mt-1 flex-1 text-sm text-black/60">{p.tagline}</p>
                        <p className="mt-3 text-sm">
                          <span className="font-bold">{formatPrice(p.priceCents, p.currency)}</span>
                          <span className="text-black/40">
                            {" "}· {p.qrSlots} QR {p.qrSlots === 1 ? "code" : "codes"}
                          </span>
                        </p>
                        <AddToCartButton
                          slug={p.slug}
                          className="mt-3 w-full rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                          Add to cart
                        </AddToCartButton>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 border-t border-black/5 bg-white/70">
          <div className="mx-auto max-w-5xl px-4 py-20">
            <Reveal className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">Pricing</p>
              <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Buy the sticker once. Keep your page live.</h2>
              <p className="mx-auto mt-3 max-w-2xl text-black/60">
                The sticker and its QR code are yours forever. A plan is what publishes your
                information when someone scans it.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <Reveal>
                <div className="flex h-full flex-col rounded-3xl border border-black/10 bg-white p-7">
                  <p className="font-semibold text-black/60">The sticker</p>
                  <p className="mt-2 text-4xl font-bold">
                    {cheapest !== null ? `from ${formatPrice(cheapest, "BDT")}` : "One-time"}
                  </p>
                  <p className="mt-1 text-sm text-black/50">one-time purchase</p>
                  <ul className="mt-6 flex-1 space-y-3 text-sm">
                    {[
                      "A printed, themed sticker shipped to you",
                      "Your own QR code in the middle — generated by you",
                      "The theme's look for your scan page, yours to keep",
                      "Download it any time to reprint",
                    ].map((f) => (
                      <li key={f} className="flex gap-3">
                        <Icon name="shield" width={18} height={18} className="shrink-0 text-[var(--color-primary)]" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/shop" className="mt-8 rounded-xl border border-black/15 px-5 py-3 text-center font-semibold hover:bg-black/5">
                    Choose a sticker
                  </Link>
                </div>
              </Reveal>

              <Reveal delay={120}>
                <div className="relative flex h-full flex-col rounded-3xl bg-[#1c1917] p-7 text-white shadow-xl">
                  <span className="absolute right-6 top-6 rounded-full bg-[var(--color-accent)] px-3 py-1 text-xs font-bold">
                    Publishes your page
                  </span>
                  <p className="font-semibold text-white/60">{plan?.name ?? "Plus"} plan</p>
                  <p className="mt-2 text-4xl font-bold">
                    {plan ? formatPrice(plan.priceCents, plan.currency) : "—"}
                  </p>
                  <p className="mt-1 text-sm text-white/50">
                    per {plan ? intervalLabel(plan.intervalMonths) : "year"} · no automatic renewal
                  </p>
                  <ul className="mt-6 flex-1 space-y-3 text-sm">
                    {(plan?.features.length
                      ? plan.features
                      : ["Your emergency page goes live for every QR you have", "Medical details, contacts and your message", "Scan alerts and the message relay"]
                    ).map((f) => (
                      <li key={f} className="flex gap-3">
                        <Icon name="sparkle" width={18} height={18} className="shrink-0 text-[var(--color-accent)]" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 rounded-xl bg-white/10 p-3 text-xs text-white/70">
                    Without a plan your QR codes still scan and finders can still message you — your
                    details just aren&apos;t shown.
                  </p>
                  <Link href="/signup" className="mt-4 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-center font-semibold transition-transform hover:scale-[1.02]">
                    Create your account
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section className="border-t border-black/5">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <Reveal className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">Privacy</p>
              <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Built to protect you, not expose you</h2>
            </Reveal>
            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              {PROMISES.map((p, i) => (
                <Reveal key={p.title} delay={i * 80}>
                  <div className="flex h-full gap-4 rounded-2xl border border-black/10 bg-white p-6 hover-lift">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                      <Icon name={p.icon} width={22} height={22} />
                    </span>
                    <div>
                      <h3 className="font-bold">{p.title}</h3>
                      <p className="mt-1 text-sm text-black/60">{p.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section className="border-y border-black/5 bg-white/70 py-10" aria-label="Things people put a Jogajog sticker on">
          <p className="text-center text-sm font-semibold text-black/50">People put Jogajog stickers on</p>
          <div className="mt-5 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <div className="anim-marquee flex w-max gap-3">
              {[...USE_CASES, ...USE_CASES].map((u, i) => (
                <span
                  key={`${u}-${i}`}
                  aria-hidden={i >= USE_CASES.length}
                  className="whitespace-nowrap rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium"
                >
                  {u}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20">
          <div className="mx-auto max-w-3xl px-4 py-20">
            <Reveal className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">FAQ</p>
              <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Questions, answered</h2>
            </Reveal>
            <div className="mt-10 space-y-3">
              {FAQ.map(([q, a], i) => (
                <Reveal key={q} delay={i * 40}>
                  <details className="group rounded-2xl border border-black/10 bg-white px-5 py-4 open:shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                      {q}
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black/5 text-lg leading-none transition-transform group-open:rotate-45" aria-hidden>
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-black/60">{a}</p>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="px-4 pb-20">
          <Reveal>
            <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-[var(--color-primary)] px-6 py-14 text-center text-white">
              <div className="bg-dots absolute inset-0 opacity-30" aria-hidden />
              <MascotCheer className="anim-bob relative mx-auto h-20 w-20 text-white" />
              <h2 className="relative mt-4 text-3xl font-bold text-balance sm:text-4xl">
                Put a Jogajog sticker on what matters.
              </h2>
              <p className="relative mx-auto mt-3 max-w-xl text-white/80">
                Takes a minute to set up. Could save a day of searching — or help the right people
                get called.
              </p>
              <div className="relative mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/shop" className="rounded-xl bg-white px-6 py-3 font-semibold text-[var(--color-primary-dark)] transition-transform hover:scale-[1.03]">
                  Get your sticker
                </Link>
                <Link href="/themes" className="rounded-xl border border-white/40 px-6 py-3 font-semibold hover:bg-white/10">
                  Browse themes
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
