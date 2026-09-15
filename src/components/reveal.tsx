"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Fades its children up into place the first time they scroll into view.
 *
 * The visibility class is set on the element directly rather than through
 * React state, so revealing never re-renders the page. Browsers without
 * IntersectionObserver, and anyone who prefers reduced motion (see
 * globals.css), get the content straight away. A <noscript> rule in the root
 * layout shows everything when JavaScript is off.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Milliseconds, for staggering siblings. */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.classList.add("is-visible");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
