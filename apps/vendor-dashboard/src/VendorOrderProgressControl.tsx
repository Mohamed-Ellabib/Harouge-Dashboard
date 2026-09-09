import { useEffect, useState } from "react";

export type DeliveryProgress = { status: "confirmed" | "processing" | "shipped" | "delivered"; revision: number };
const steps: DeliveryProgress["status"][] = ["confirmed", "processing", "shipped", "delivered"];
const apiBase = (import.meta.env.VITE_MEDUSA_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:9000`).replace(/\/$/, "");

export function VendorOrderProgressControl({ orderId, onUpdated }: { orderId: string; onUpdated: (progress: DeliveryProgress) => void }) {
  const [progress, setProgress] = useState<DeliveryProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refresh = async (signal?: AbortSignal) => {
    const response = await fetch(`${apiBase}/vendor/orders/${encodeURIComponent(orderId)}`, { credentials: "include", signal });
    if (!response.ok) throw new Error("Order status could not be loaded. Please try again.");
    const result = await response.json();
    const next = result.order.fulfillment_progress as DeliveryProgress;
    setProgress(next); setError("");
  };
  useEffect(() => { const controller = new AbortController(); void refresh(controller.signal).catch(error => { if (!controller.signal.aborted) setError(error.message); }); return () => controller.abort(); }, [orderId]);
  const advance = async () => {
    if (!progress || busy) return;
    const status = steps[steps.indexOf(progress.status) + 1];
    if (!status) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`${apiBase}/vendor/orders/${encodeURIComponent(orderId)}/progress`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, revision: progress.revision }),
      });
      if (!response.ok) throw new Error(response.status === 403 ? "Only the store owner can update delivery progress." : "Status was not changed. Refresh the order and try again.");
      const result = await response.json(); setProgress(result.progress); onUpdated(result.progress);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not update the order."); }
    finally { setBusy(false); }
  };
  return <section aria-label="Delivery progress"><h3>Delivery progress</h3><p>{progress ? progress.status : "Loading…"}</p>
    <p>Update this only when the delivery step actually happens. Customers see the saved status.</p>
    {error ? <p role="alert">{error} <button onClick={() => void refresh().catch(error => setError(error.message))}>Refresh</button></p> : null}
    {progress && progress.status !== "delivered" ? <button className="vendor-orders__modal-submit" disabled={busy} onClick={() => void advance()}>{busy ? "Saving…" : `Mark ${steps[steps.indexOf(progress.status) + 1]}`}</button> : null}
  </section>;
}
