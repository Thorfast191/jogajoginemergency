// Rough, dependency-free UA summary for the scan log — good enough to tell
// "someone's phone" from "a script," not meant to be exhaustive.
export function summarizeUserAgent(ua?: string | null): string {
  if (!ua) return "Unknown device";

  const os = /iphone|ipad/i.test(ua)
    ? "iOS"
    : /android/i.test(ua)
      ? "Android"
      : /windows/i.test(ua)
        ? "Windows"
        : /mac os/i.test(ua)
          ? "Mac"
          : /linux/i.test(ua)
            ? "Linux"
            : null;

  const browser = /edg\//i.test(ua)
    ? "Edge"
    : /chrome\//i.test(ua)
      ? "Chrome"
      : /safari\//i.test(ua) && !/chrome\//i.test(ua)
        ? "Safari"
        : /firefox\//i.test(ua)
          ? "Firefox"
          : null;

  if (os && browser) return `${browser} on ${os}`;
  if (os) return os;
  if (browser) return browser;
  return "Unknown device";
}
