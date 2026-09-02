/**
 * Friendly inline-SVG spot illustrations. One rounded "blob" mascot in a few
 * poses plus a handful of empty-state marks. Two-tone: `currentColor` for the
 * body (set via a text color class) and `--color-accent` for the highlight.
 * Keep them subtle — never on the emergency scan page.
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

const accent = "var(--color-accent, #F98A6B)";

/** Body + eyes shared by every mascot pose. */
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

export function MascotWave(props: Props) {
  return (
    <Svg label="Waving mascot" {...props}>
      <Body mouth={<path d="M52 66q8 8 16 0" stroke="#fff" strokeWidth="3" strokeLinecap="round" />} />
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
      <Body mouth={<path d="M50 64q10 12 20 0" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />} />
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
      <path
        d="M60 74l14 5v10c0 8-6 13-14 17-8-4-14-9-14-17V79l14-5Z"
        fill={accent}
        opacity="0.9"
      />
      <path d="M54 90l4 4 8-8" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

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

export const EmptyInbox = EmptyMessages;
