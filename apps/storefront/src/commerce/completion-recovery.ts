import {
  isStorefrontApiError,
  type StorefrontApiError,
} from "../api/storefront-api";
import type { StorefrontPaymentMethod } from "../types";

const COMPLETION_STORAGE_PREFIX = "labibtech:storefront:completion:v1";
const MAX_CART_ID_LENGTH = 200;
const STORE_HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const CART_ID_PATTERN = /^[A-Za-z0-9_-]+$/u;
const CURRENCY_PATTERN = /^[a-z]{3}$/u;

export type StorefrontCompletionMarker = {
  cart_id: string;
  currency_code: string;
  payment_method: StorefrontPaymentMethod;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean => {
  const keys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return (
    keys.length === expected.length &&
    keys.every((key, index) => key === expected[index])
  );
};

export const completionRecoveryStorageKey = (storeHandle: string): string => {
  if (!STORE_HANDLE_PATTERN.test(storeHandle) || storeHandle.length > 200) {
    throw new Error("A valid Store handle is required for completion recovery.");
  }

  return `${COMPLETION_STORAGE_PREFIX}:${storeHandle}`;
};

export const parseCompletionRecoveryMarker = (
  rawValue: string | null,
  expectedCurrency: string,
): StorefrontCompletionMarker | null => {
  if (!rawValue || !CURRENCY_PATTERN.test(expectedCurrency)) return null;

  let value: unknown;
  try {
    value = JSON.parse(rawValue) as unknown;
  } catch {
    return null;
  }

  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["cart_id", "currency_code", "payment_method"]) ||
    typeof value.cart_id !== "string" ||
    value.cart_id.length === 0 ||
    value.cart_id.length > MAX_CART_ID_LENGTH ||
    !CART_ID_PATTERN.test(value.cart_id) ||
    value.currency_code !== expectedCurrency ||
    (value.payment_method !== "cod" &&
      value.payment_method !== "bank_transfer")
  ) {
    return null;
  }

  return {
    cart_id: value.cart_id,
    currency_code: value.currency_code,
    payment_method: value.payment_method,
  };
};

export const readCompletionRecoveryMarker = (
  storage: Storage,
  storeHandle: string,
  expectedCurrency: string,
): StorefrontCompletionMarker | null => {
  const key = completionRecoveryStorageKey(storeHandle);
  let rawValue: string | null;

  try {
    rawValue = storage.getItem(key);
  } catch {
    return null;
  }

  const marker = parseCompletionRecoveryMarker(rawValue, expectedCurrency);
  if (!marker && rawValue !== null) {
    try {
      storage.removeItem(key);
    } catch {
      // Invalid recovery state is ignored when storage cannot be updated.
    }
  }

  return marker;
};

export const writeCompletionRecoveryMarker = (
  storage: Storage,
  storeHandle: string,
  marker: StorefrontCompletionMarker,
): boolean => {
  const key = completionRecoveryStorageKey(storeHandle);
  const serialized = JSON.stringify(marker);
  if (!parseCompletionRecoveryMarker(serialized, marker.currency_code)) {
    return false;
  }

  try {
    storage.setItem(key, serialized);
    const persisted = parseCompletionRecoveryMarker(
      storage.getItem(key),
      marker.currency_code,
    );
    const storedExactly =
      persisted?.cart_id === marker.cart_id &&
      persisted.currency_code === marker.currency_code &&
      persisted.payment_method === marker.payment_method;
    if (!storedExactly) storage.removeItem(key);
    return storedExactly;
  } catch {
    return false;
  }
};

export const clearCompletionRecoveryMarker = (
  storage: Storage,
  storeHandle: string,
): void => {
  try {
    storage.removeItem(completionRecoveryStorageKey(storeHandle));
  } catch {
    // In-memory state still prevents duplicate submission in this page session.
  }
};

export const isIndeterminateCompletionError = (
  error: unknown,
): error is StorefrontApiError =>
  isStorefrontApiError(error) &&
  (error.code === "aborted" ||
    error.code === "configuration" ||
    error.code === "invalid_response" ||
    (error.code === "unavailable" && error.retryable));

export const shouldAutomaticallyRecoverCompletion = (
  error: unknown,
): boolean =>
  isStorefrontApiError(error) &&
  (error.code === "invalid_response" ||
    (error.code === "unavailable" && error.retryable));

export const completeWithSingleRecovery = async <Result>(
  marker: StorefrontCompletionMarker,
  complete: (marker: StorefrontCompletionMarker) => Promise<Result>,
): Promise<Result> => {
  try {
    return await complete(marker);
  } catch (error: unknown) {
    if (!shouldAutomaticallyRecoverCompletion(error)) throw error;
    return await complete(marker);
  }
};
