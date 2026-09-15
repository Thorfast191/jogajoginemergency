/**
 * Small line icons for navigation. One stroke style, 24px grid, currentColor,
 * so they inherit whatever text colour the link is in.
 */
import type { SVGProps } from "react";

const PATHS = {
  home: "M3 11 12 4l9 7M5 10v10h5v-6h4v6h5V10",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4-6.3",
  lock: "M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2h-2",
  box: "M3 7l9-4 9 4-9 4-9-4ZM3 7v10l9 4 9-4V7M12 11v10",
  palette: "M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-1.1.9-2 2-2h2.3A4.7 4.7 0 0 0 22 9.8C22 6 17.5 3 12 3ZM7.5 11.5h.01M9.5 7.5h.01M14.5 7.5h.01",
  cart: "M3 4h2l2.4 11h11L21 7H6.2M9 20h.01M18 20h.01",
  card: "M3 6h18v12H3zM3 10h18M7 15h4",
  wallet: "M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3zM3 7V5a2 2 0 0 1 2-2h11M16 13.5h.01",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  shield: "M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6l-8-3ZM9 12l2 2 4-4",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2L10 21h4l.6-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  message: "M4 5h16v11H9l-5 4V5Z",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 8h6M9 12h6",
  sparkle: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6 6 18",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      width={18}
      height={18}
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
