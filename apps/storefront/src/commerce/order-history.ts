const key = (handle: string) => `labibtech:order-access:${handle}`;
// Store access grants only, never customer addresses or payment information.
export function rememberOrderGrant(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return;
  const handle = document.documentElement.dataset.storeHandle;
  if (!handle) return;
  try { const grants = readOrderGrants(handle); window.localStorage.setItem(key(handle), JSON.stringify([token, ...grants.filter(item => item !== token)].slice(0, 25))); } catch { /* The confirmation still exposes tracking in this session. */ }
}
export function readOrderGrants(handle: string): string[] {
  try { const values: unknown = JSON.parse(window.localStorage.getItem(key(handle)) ?? "[]"); return Array.isArray(values) ? values.filter((token): token is string => typeof token === "string" && /^[a-f0-9]{64}$/.test(token)).slice(0, 25) : []; } catch { return []; }
}
