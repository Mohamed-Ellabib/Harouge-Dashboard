import { allowedStorefrontEditorOrigins } from "./editor-preview";

export const isCreationTrial = () => typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("editor-preview") === "1" &&
  /^stdraft_[a-f0-9-]{36}$/.test(new URLSearchParams(window.location.search).get("setup-preview") ?? "");

/** The iframe never receives admin credentials or chooses an API/store path.
 * Only the authenticated parent can execute this bounded draft command. */
export function creationTrialRequest(command: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> {
  if (!isCreationTrial() || window.parent === window) return Promise.reject(new Error("Open this saved draft in the authenticated editor."));
  const channel = new URLSearchParams(window.location.search).get("channel") ?? "";
  const origins = allowedStorefrontEditorOrigins(import.meta.env.VITE_PLATFORM_ADMIN_ORIGIN, import.meta.env.DEV);
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(channel) || !origins.length) return Promise.reject(new Error("The editor connection is unavailable."));
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const cleanup = () => { clearTimeout(timeout); window.removeEventListener("message", receive); signal?.removeEventListener("abort", abort); };
    const abort = () => { cleanup(); reject(new DOMException("Aborted", "AbortError")); };
    const receive = (event: MessageEvent<unknown>) => {
      if (event.source !== window.parent || !origins.includes(event.origin) || !event.data || typeof event.data !== "object") return;
      const data = event.data as Record<string, unknown>;
      if (data.type !== "labibtech:creation-trial-response" || data.version !== 1 || data.channel !== channel || data.request_id !== requestId) return;
      cleanup();
      if (data.error) reject(new Error("Could not save this trial action. Check the draft and retry."));
      else resolve(data.result);
    };
    const timeout = window.setTimeout(() => { cleanup(); reject(new Error("The editor did not respond. No local-only checkout was used.")); }, 20_000);
    window.addEventListener("message", receive); signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) { abort(); return; }
    for (const origin of origins) window.parent.postMessage({ type: "labibtech:creation-trial-request", version: 1, channel, request_id: requestId, command }, origin);
  });
}
