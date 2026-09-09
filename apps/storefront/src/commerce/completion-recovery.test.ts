import { describe, expect, it } from "vitest";

import { StorefrontApiError } from "../api/storefront-api";
import {
  clearCompletionRecoveryMarker,
  completeWithSingleRecovery,
  completionRecoveryStorageKey,
  isIndeterminateCompletionError,
  parseCompletionRecoveryMarker,
  readCompletionRecoveryMarker,
  shouldAutomaticallyRecoverCompletion,
  type StorefrontCompletionMarker,
  writeCompletionRecoveryMarker,
} from "./completion-recovery";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const marker = {
  cart_id: "cart_01HZZZZZZZZZZZZZZZZZZZZZZZ",
  currency_code: "lyd",
  payment_method: "bank_transfer",
} as const;

describe("completion recovery marker", () => {
  it("stores only the exact minimal marker in a Store-partitioned key", () => {
    const storage = new MemoryStorage();

    expect(
      writeCompletionRecoveryMarker(storage, "al-sanousi", marker),
    ).toBe(true);
    expect(
      readCompletionRecoveryMarker(storage, "al-sanousi", "lyd"),
    ).toEqual(marker);
    expect(
      readCompletionRecoveryMarker(storage, "another-store", "lyd"),
    ).toBeNull();
    expect(
      JSON.parse(
        storage.getItem(completionRecoveryStorageKey("al-sanousi")) ?? "{}",
      ),
    ).toEqual(marker);

    clearCompletionRecoveryMarker(storage, "al-sanousi");
    expect(storage.length).toBe(0);
  });

  it("rejects malformed, crossed-currency, unknown-method and expanded markers", () => {
    expect(parseCompletionRecoveryMarker("not-json", "lyd")).toBeNull();
    expect(
      parseCompletionRecoveryMarker(
        JSON.stringify({ ...marker, currency_code: "usd" }),
        "lyd",
      ),
    ).toBeNull();
    expect(
      parseCompletionRecoveryMarker(
        JSON.stringify({ ...marker, payment_method: "card" }),
        "lyd",
      ),
    ).toBeNull();
    expect(
      parseCompletionRecoveryMarker(
        JSON.stringify({ ...marker, confirmation: { bank_name: "private" } }),
        "lyd",
      ),
    ).toBeNull();
    expect(
      parseCompletionRecoveryMarker(
        JSON.stringify({ ...marker, cart_id: "../crossed-cart" }),
        "lyd",
      ),
    ).toBeNull();
  });

  it("removes an invalid marker and fails closed when persistence is unavailable", () => {
    const storage = new MemoryStorage();
    const key = completionRecoveryStorageKey("al-sanousi");
    storage.setItem(key, JSON.stringify({ ...marker, customer_email: "x@test" }));

    expect(
      readCompletionRecoveryMarker(storage, "al-sanousi", "lyd"),
    ).toBeNull();
    expect(storage.getItem(key)).toBeNull();

    const blockedStorage = {
      ...storage,
      setItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Storage;
    expect(
      writeCompletionRecoveryMarker(blockedStorage, "al-sanousi", marker),
    ).toBe(false);
  });
});

describe("completion recovery classification", () => {
  it("automatically retries only response-loss outcomes and retains only indeterminate state", () => {
    const timeout = new StorefrontApiError("unavailable", true);
    const conflict = new StorefrontApiError("unavailable", false);
    const invalidResponse = new StorefrontApiError("invalid_response");
    const notFound = new StorefrontApiError("not_found");

    expect(shouldAutomaticallyRecoverCompletion(timeout)).toBe(true);
    expect(shouldAutomaticallyRecoverCompletion(invalidResponse)).toBe(true);
    expect(shouldAutomaticallyRecoverCompletion(conflict)).toBe(false);
    expect(isIndeterminateCompletionError(timeout)).toBe(true);
    expect(isIndeterminateCompletionError(invalidResponse)).toBe(true);
    expect(isIndeterminateCompletionError(conflict)).toBe(false);
    expect(isIndeterminateCompletionError(notFound)).toBe(false);
  });

  it("makes exactly one bounded retry with the same cart, currency and method", async () => {
    const complete = async (attemptMarker: StorefrontCompletionMarker) => {
      calls.push({ ...attemptMarker });
      if (calls.length === 1) {
        throw new StorefrontApiError("unavailable", true);
      }
      return "confirmed";
    };
    const calls: StorefrontCompletionMarker[] = [];

    await expect(completeWithSingleRecovery(marker, complete)).resolves.toBe(
      "confirmed",
    );
    expect(calls).toEqual([marker, marker]);

    const definitive = async (attemptMarker: StorefrontCompletionMarker) => {
      definitiveCalls.push({ ...attemptMarker });
      throw new StorefrontApiError("not_found");
    };
    const definitiveCalls: StorefrontCompletionMarker[] = [];
    await expect(
      completeWithSingleRecovery(marker, definitive),
    ).rejects.toMatchObject({ code: "not_found" });
    expect(definitiveCalls).toEqual([marker]);
  });
});
