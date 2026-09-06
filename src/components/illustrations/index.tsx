/**
 * The mascot cast and a handful of empty-state marks, all inline SVG.
 *
 * Every character here is original. Themes are named and drawn so they read as
 * archetypes — a caped guardian, a web-slinger, a speedster — without copying
 * any licensed character's likeness, name or costume.
 *
 * Two-tone: `currentColor` for the body (set with a text colour class) and
 * `--skin-accent` for the highlight, so a mascot picks up whatever theme it is
 * rendered inside.
 */
import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { label?: string };

function Svg({ label, children, className, ...rest }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label={label}
      className={className ?? "w-24 h-24 text-emerald-600"}
      fill="none"
      {...rest}
    >
      {children}
    </svg>
  );
}

const accent = "var(--skin-accent, var(--color-accent, #F98A6B))";

/** Body + eyes shared by every pose. */
function Body({ mouth }: { mouth: React.ReactNode }) {
  return (
    <>
      <path
        d="M60 14c22 0 38 15 38 40 0 28-16 52-38 52S22 82 22 54c0-25 16-40 38-40Z"
        fill="currentColor"
        opacity="0.14"
      />
      <path
        d="M60 20c19 0 32 13 32 34 0 25-14 46-32 46S28 79 28 54c0-21 13-34 32-34Z"
        fill="currentColor"
        opacity="0.9"
      />
      <circle cx="50" cy="52" r="4.5" fill="#fff" />
      <circle cx="70" cy="52" r="4.5" fill="#fff" />
      {mouth}
    </>
  );
}

const smile = (
  <path d="M52 66q8 8 16 0" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
);

// --- Poses (used across the marketing site and dashboard) ----------------

export function MascotWave(props: Props) {
  return (
    <Svg label="Waving mascot" {...props}>
      <Body mouth={smile} />
      <path d="M92 46c8-4 14-2 16 4" stroke={accent} strokeWidth="6" strokeLinecap="round" />
      <circle cx="100" cy="40" r="6" fill={accent} />
    </Svg>
  );
}

export function MascotSearch(props: Props) {
  return (
    <Svg label="Searching mascot" {...props}>
      <Body mouth={<circle cx="60" cy="66" r="4" fill="#fff" />} />
      <circle cx="86" cy="70" r="12" stroke={accent} strokeWidth="5" />
      <path d="M95 79l10 10" stroke={accent} strokeWidth="6" strokeLinecap="round" />
    </Svg>
  );
}

export function MascotCheer(props: Props) {
  return (
    <Svg label="Celebrating mascot" {...props}>
      <Body
        mouth={<path d="M50 64q10 12 20 0" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />}
      />
      <path d="M30 40l-8-8M60 24v-10M90 40l8-8" stroke={accent} strokeWidth="5" strokeLinecap="round" />
    </Svg>
  );
}

export function MascotThink(props: Props) {
  return (
    <Svg label="Thinking mascot" {...props}>
      <Body mouth={<path d="M54 66h12" stroke="#fff" strokeWidth="3" strokeLinecap="round" />} />
      <circle cx="90" cy="34" r="4" fill={accent} />
      <circle cx="100" cy="24" r="6" fill={accent} />
    </Svg>
  );
}

export function MascotShield(props: Props) {
  return (
    <Svg label="Safety mascot" {...props}>
      <Body mouth={<path d="M52 66q8 6 16 0" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />} />
      <path d="M60 74l14 5v10c0 8-6 13-14 17-8-4-14-9-14-17V79l14-5Z" fill={accent} opacity="0.9" />
      <path d="M54 90l4 4 8-8" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// --- Theme cast -----------------------------------------------------------
// One per Theme.mascot key. All original designs.

/** The house character: a friendly rounded blob. */
export const MascotBlob = MascotWave;

/** Caped and masked night watcher. */
export function MascotGuardian(props: Props) {
  return (
    <Svg label="Guardian mascot" {...props}>
      {/* cape behind the body */}
      <path d="M28 46c-10 14-14 34-8 52 12-6 20-8 40-8s28 2 40 8c6-18 2-38-8-52-8 10-18 14-32 14s-24-4-32-14Z" fill={accent} opacity="0.35" />
      <Body mouth={<path d="M53 68h14" stroke="#fff" strokeWidth="3" strokeLinecap="round" />} />
      {/* pointed ears */}
      <path d="M40 26l-4-16 14 10ZM80 26l4-16-14 10Z" fill="currentColor" />
      {/* mask band */}
      <path d="M36 46h48v10a8 8 0 0 1-8 8H44a8 8 0 0 1-8-8V46Z" fill="currentColor" opacity="0.55" />
      <circle cx="50" cy="52" r="3.5" fill={accent} />
      <circle cx="70" cy="52" r="3.5" fill={accent} />
    </Svg>
  );
}

/** Web-slinger: masked, big lensed eyes, a strand of web. */
export function MascotWebbed(props: Props) {
  return (
    <Svg label="Web-slinger mascot" {...props}>
      <Body mouth={<path d="M54 68h12" stroke="#fff" strokeWidth="3" strokeLinecap="round" />} />
      {/* web lines across the head */}
      <g stroke={accent} strokeWidth="1.8" opacity="0.7">
        <path d="M60 22v56M32 50h56M38 32l44 36M82 32L38 68" />
        <path d="M60 34c10 0 18 6 20 16M60 34c-10 0-18 6-20 16" fill="none" />
      </g>
      {/* lensed eyes over the web */}
      <path d="M40 48c4-6 12-6 15 0 2 5-2 10-8 10s-9-5-7-10Z" fill="#fff" />
      <path d="M80 48c-4-6-12-6-15 0-2 5 2 10 8 10s9-5 7-10Z" fill="#fff" />
      <path d="M96 30l14-12" stroke={accent} strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

/** Speedster: goggles and a lightning bolt. */
export function MascotSpark(props: Props) {
  return (
    <Svg label="Speedster mascot" {...props}>
      {/* speed lines */}
      <path d="M8 44h18M4 58h22M10 72h16" stroke={accent} strokeWidth="4" strokeLinecap="round" opacity="0.6" />
      <Body mouth={<path d="M52 66q8 8 16 0" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />} />
      {/* goggle strap */}
      <path d="M34 46h52" stroke="currentColor" strokeWidth="5" opacity="0.6" strokeLinecap="round" />
      <circle cx="50" cy="52" r="8" fill="#fff" />
      <circle cx="70" cy="52" r="8" fill="#fff" />
      <circle cx="50" cy="52" r="3" fill="currentColor" />
      <circle cx="70" cy="52" r="3" fill="currentColor" />
      <path d="M64 76l-10 16h8l-4 12 12-18h-8l4-10Z" fill={accent} />
    </Svg>
  );
}

/** Loyal companion: ears, snout, and a wagging tail. */
export function MascotRover(props: Props) {
  return (
    <Svg label="Companion mascot" {...props}>
      {/* floppy ears behind */}
      <path d="M30 34c-8 2-12 12-10 24 2 10 8 14 14 12ZM90 34c8 2 12 12 10 24-2 10-8 14-14 12Z" fill={accent} opacity="0.8" />
      <Body mouth={null} />
      {/* snout */}
      <ellipse cx="60" cy="68" rx="14" ry="10" fill="#fff" opacity="0.95" />
      <ellipse cx="60" cy="62" rx="5" ry="3.5" fill="currentColor" />
      <path d="M60 66v5M60 71q-5 4-9 0M60 71q5 4 9 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {/* tail */}
      <path d="M92 84c10-2 14-10 12-18" stroke={accent} strokeWidth="6" strokeLinecap="round" />
    </Svg>
  );
}

const CAST = {
  BLOB: MascotBlob,
  GUARDIAN: MascotGuardian,
  WEBBED: MascotWebbed,
  SPARK: MascotSpark,
  ROVER: MascotRover,
} as const;

/**
 * Render whichever cast member a theme names, falling back to the blob. The
 * key comes from the database, so an unknown value must never blow up a page a
 * stranger is trying to read in an emergency.
 */
export function ThemeMascot({ mascot, ...props }: Props & { mascot?: string | null }) {
  const Component = CAST[(mascot ?? "BLOB") as keyof typeof CAST] ?? MascotBlob;
  return <Component {...props} />;
}

// --- Empty-state marks ----------------------------------------------------

function EmptyMark({ label, children, className }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 120 90"
      role="img"
      aria-label={label}
      className={className ?? "w-28 h-20 text-black/20"}
      fill="none"
    >
      {children}
    </svg>
  );
}

export function EmptyTags(props: Props) {
  return (
    <EmptyMark label="No tags" {...props}>
      <rect x="24" y="20" width="72" height="50" rx="10" stroke="currentColor" strokeWidth="4" />
      <circle cx="40" cy="34" r="4" fill="currentColor" />
      <path d="M36 58h48M36 48h30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </EmptyMark>
  );
}

export function EmptyOrders(props: Props) {
  return (
    <EmptyMark label="No orders" {...props}>
      <path d="M30 28h60l-6 40H36l-6-40Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <path d="M44 28v-6a16 16 0 0 1 32 0v6" stroke="currentColor" strokeWidth="4" />
    </EmptyMark>
  );
}

export function EmptyMessages(props: Props) {
  return (
    <EmptyMark label="No messages" {...props}>
      <path
        d="M26 24h68a6 6 0 0 1 6 6v30a6 6 0 0 1-6 6H50l-16 12V66h-8a6 6 0 0 1-6-6V30a6 6 0 0 1 6-6Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </EmptyMark>
  );
}

export function EmptyCart(props: Props) {
  return (
    <EmptyMark label="Empty cart" {...props}>
      <path d="M22 24h12l10 34h44" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38 34h60l-8 24H44" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="52" cy="72" r="6" stroke="currentColor" strokeWidth="4" />
      <circle cx="82" cy="72" r="6" stroke="currentColor" strokeWidth="4" />
    </EmptyMark>
  );
}

export const EmptyInbox = EmptyMessages;
