/**
 * The gateways to offer: the ones the environment configured, minus the ones a
 * super admin switched off in platform settings.
 *
 * Only ever subtracts. Credentials live in the environment, and a settings row
 * must never be able to switch on a gateway that isn't configured — DEMO in
 * production would hand out orders for nothing.
 */
export function enabledProviderIds<T extends string>(
  configured: readonly T[],
  disabled: readonly string[],
): T[] {
  const off = new Set(disabled);
  return configured.filter((id) => !off.has(id));
}
