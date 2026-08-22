import crypto from "crypto";

// We never persist raw IP addresses (PII). Hashing with a server-side salt
// still lets abuse detection dedupe scans from the same source.
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? "dev-salt";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
