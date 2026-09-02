// Guards a `?next=` redirect target: must be a same-origin absolute path, not
// a protocol-relative or backslash-smuggled URL.
export function isSafeNext(value: string | null | undefined): boolean {
  if (!value) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
  return true;
}
