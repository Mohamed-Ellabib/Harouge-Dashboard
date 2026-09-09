import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  addStorefrontCartItem,
  completeStorefrontCart,
  createStorefrontCart,
  fetchStorefrontCart,
  fetchStorefrontShippingOptions,
  isStorefrontApiError,
  prepareStorefrontSystemPayment,
  removeStorefrontCartItem,
  selectStorefrontShippingOption,
  updateStorefrontCartItem,
  updateStorefrontCheckoutAddress,
} from "../api/storefront-api";
import { storefrontUiText } from "../lib/localization";
import { navigate } from "../lib/navigation";
import {
  clearCompletionRecoveryMarker,
  completeWithSingleRecovery,
  isIndeterminateCompletionError,
  readCompletionRecoveryMarker,
  writeCompletionRecoveryMarker,
  type StorefrontCompletionMarker,
} from "./completion-recovery";
import type {
  StorefrontCartDto,
  StorefrontCheckoutAddress,
  StorefrontCommerceCapabilitiesDto,
  StorefrontOrderConfirmationDto,
  StorefrontLocale,
  StorefrontPaymentMethod,
  StorefrontShippingOptionDto,
} from "../types";

const CART_STORAGE_KEY = "labibtech:storefront:cart:v1";
const cartStorageKey = () => {
  const draft = new URLSearchParams(window.location.search).get("setup-preview");
  return draft && /^stdraft_[a-f0-9-]{36}$/.test(draft) ? `${CART_STORAGE_KEY}:${draft}` : CART_STORAGE_KEY;
};

type CartContextValue = {
  capability: StorefrontCommerceCapabilitiesDto;
  cart: StorefrontCartDto | null;
  confirmation: StorefrontOrderConfirmationDto | null;
  error: string | null;
  indeterminateCompletion: boolean;
  pending: boolean;
  restoring: boolean;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  submitAddress: (
    address: StorefrontCheckoutAddress,
  ) => Promise<StorefrontShippingOptionDto[]>;
  selectShipping: (optionId: string) => Promise<void>;
  completeOrder: (
    paymentMethod: StorefrontPaymentMethod,
  ) => Promise<StorefrontOrderConfirmationDto>;
  retryCompletion: () => Promise<void>;
  clearError: () => void;
  clearConfirmation: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const availableCurrency = (
  capability: StorefrontCommerceCapabilitiesDto,
): string | null =>
  capability.online_checkout.status === "available"
    ? capability.online_checkout.currency_code
    : null;

const clearStoredCart = () => {
  try {
    window.sessionStorage.removeItem(cartStorageKey());
  } catch {
    // Browser storage can be unavailable; the in-memory Cart remains authoritative.
  }
};

const storeCartId = (cartId: string) => {
  try {
    window.sessionStorage.setItem(cartStorageKey(), cartId);
  } catch {
    // Checkout still works for the current page when storage is unavailable.
  }
};

const readStoredCompletionMarker = (
  storeHandle: string,
  currency: string,
): StorefrontCompletionMarker | null => {
  try {
    return readCompletionRecoveryMarker(
      window.sessionStorage,
      storeHandle,
      currency,
    );
  } catch {
    return null;
  }
};

const storeCompletionMarker = (
  storeHandle: string,
  marker: StorefrontCompletionMarker,
): boolean => {
  try {
    return writeCompletionRecoveryMarker(
      window.sessionStorage,
      storeHandle,
      marker,
    );
  } catch {
    return false;
  }
};

const clearStoredCompletionMarker = (storeHandle: string) => {
  try {
    clearCompletionRecoveryMarker(window.sessionStorage, storeHandle);
  } catch {
    // The in-memory completion lock remains active for this page session.
  }
};

export const CartProvider = ({
  capability,
  children,
  locale,
  storeHandle,
}: {
  capability: StorefrontCommerceCapabilitiesDto;
  children: ReactNode;
  locale: StorefrontLocale;
  storeHandle: string;
}) => {
  const currency = availableCurrency(capability);
  const genericError = storefrontUiText(locale, {
    ar: "تعذّر تحديث السلة الآن. حاول مرة أخرى بعد قليل.",
    en: "The cart could not be updated. Please try again in a moment.",
  });
  const checkoutError = storefrontUiText(locale, {
    ar: "تعذّر متابعة إتمام الطلب الآن. راجع بياناتك وحاول مجددًا.",
    en: "Checkout could not continue. Review your details and try again.",
  });
  const indeterminateError = storefrontUiText(locale, {
    ar: "لم نتمكن من تأكيد نتيجة الطلب. يمكنك التحقق من النتيجة بأمان دون إنشاء طلب جديد.",
    en: "We could not confirm the order result. You can safely check the result without creating a new order.",
  });
  const recoveryStorageError = storefrontUiText(locale, {
    ar: "يتطلب تأكيد الطلب تخزيناً مؤقتاً آمناً في هذه الجلسة. فعّل تخزين الموقع ثم حاول مجدداً.",
    en: "Order confirmation requires secure temporary storage for this session. Enable site storage and try again.",
  });
  const [cart, setCart] = useState<StorefrontCartDto | null>(null);
  const [confirmation, setConfirmation] =
    useState<StorefrontOrderConfirmationDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [indeterminateCompletion, setIndeterminateCompletion] = useState(false);
  const [pending, setPending] = useState(false);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    setIndeterminateCompletion(false);
    setRestoring(true);

    if (!currency) {
      setCart(null);
      clearStoredCart();
      setRestoring(false);
      return () => controller.abort();
    }

    const restoreOpenCart = async () => {
      let cartId: string | null = null;
      try {
        cartId = window.sessionStorage.getItem(cartStorageKey());
      } catch {
        cartId = null;
      }

      if (!cartId) {
        setCart(null);
        return;
      }

      try {
        const restored = await fetchStorefrontCart(cartId, currency, {
          signal: controller.signal,
        });
        if (restored.completed) {
          setCart(null);
          clearStoredCart();
          return;
        }
        setCart(restored);
      } catch (caught: unknown) {
        if (isStorefrontApiError(caught) && caught.code === "aborted") return;
        setCart(null);
        clearStoredCart();
      }
    };

    const restore = async () => {
      const marker = readStoredCompletionMarker(storeHandle, currency);

      if (marker) {
        try {
          const recovered = await completeStorefrontCart(
            marker.cart_id,
            marker.currency_code,
            marker.payment_method,
            { signal: controller.signal },
          );
          if (controller.signal.aborted) return;
          setConfirmation(recovered);
          setCart(null);
          clearStoredCart();
          clearStoredCompletionMarker(storeHandle);
          navigate("/order-confirmation", { replace: true });
          return;
        } catch (caught: unknown) {
          if (isStorefrontApiError(caught) && caught.code === "aborted") return;
          if (isIndeterminateCompletionError(caught)) {
            setCart(null);
            setIndeterminateCompletion(true);
            setError(indeterminateError);
            return;
          }
          clearStoredCompletionMarker(storeHandle);
        }
      }

      await restoreOpenCart();
    };

    void restore().finally(() => {
      if (!controller.signal.aborted) setRestoring(false);
    });

    return () => controller.abort();
  }, [currency, indeterminateError, storeHandle]);

  const runMutation = useCallback(
    async (operation: () => Promise<StorefrontCartDto>) => {
      setPending(true);
      setError(null);
      try {
        const nextCart = await operation();
        setCart(nextCart);
        storeCartId(nextCart.id);
        return nextCart;
      } catch {
        setError(genericError);
        throw new Error(genericError);
      } finally {
        setPending(false);
      }
    },
    [genericError],
  );

  const addItem = useCallback(
    async (variantId: string, quantity = 1) => {
      if (!currency) throw new Error(genericError);
      await runMutation(async () => {
        const targetCart = cart ?? (await createStorefrontCart(currency));
        return await addStorefrontCartItem(
          targetCart.id,
          variantId,
          quantity,
          currency,
        );
      });
    },
    [cart, currency, genericError, runMutation],
  );

  const updateQuantity = useCallback(
    async (lineId: string, quantity: number) => {
      if (!cart || !currency) throw new Error(genericError);
      await runMutation(() =>
        updateStorefrontCartItem(cart.id, lineId, quantity, currency),
      );
    },
    [cart, currency, genericError, runMutation],
  );

  const removeItem = useCallback(
    async (lineId: string) => {
      if (!cart || !currency) throw new Error(genericError);
      const nextCart = await runMutation(() =>
        removeStorefrontCartItem(cart.id, lineId, currency),
      );
      if (!nextCart.items.length) {
        clearStoredCart();
      }
    },
    [cart, currency, genericError, runMutation],
  );

  const submitAddress = useCallback(
    async (address: StorefrontCheckoutAddress) => {
      if (!cart || !currency) throw new Error(checkoutError);
      setPending(true);
      setError(null);
      try {
        const updated = await updateStorefrontCheckoutAddress(
          cart.id,
          address,
          currency,
        );
        setCart(updated);
        return await fetchStorefrontShippingOptions(updated.id);
      } catch {
        setError(checkoutError);
        throw new Error(checkoutError);
      } finally {
        setPending(false);
      }
    },
    [cart, checkoutError, currency],
  );

  const selectShipping = useCallback(
    async (optionId: string) => {
      if (!cart || !currency) throw new Error(checkoutError);
      await runMutation(() =>
        selectStorefrontShippingOption(cart.id, optionId, currency),
      );
    },
    [cart, checkoutError, currency, runMutation],
  );

  const completeOrder = useCallback(
    async (paymentMethod: StorefrontPaymentMethod) => {
      if (!cart || !currency || !cart.shipping_method_selected) {
        throw new Error(checkoutError);
      }
      setPending(true);
      setError(null);
      setIndeterminateCompletion(false);
      let markerPersisted = false;
      try {
        await prepareStorefrontSystemPayment(cart.id);
        const refreshed = await fetchStorefrontCart(cart.id, currency);
        setCart(refreshed);

        const marker: StorefrontCompletionMarker = {
          cart_id: cart.id,
          currency_code: currency,
          payment_method: paymentMethod,
        };
        markerPersisted = storeCompletionMarker(storeHandle, marker);
        if (!markerPersisted) {
          setError(recoveryStorageError);
          throw new Error(recoveryStorageError);
        }

        const completed = await completeWithSingleRecovery(
          marker,
          (attempt) =>
            completeStorefrontCart(
              attempt.cart_id,
              attempt.currency_code,
              attempt.payment_method,
            ),
        );

        setConfirmation(completed);
        setCart(null);
        clearStoredCart();
        clearStoredCompletionMarker(storeHandle);
        return completed;
      } catch (caught: unknown) {
        if (caught instanceof Error && caught.message === recoveryStorageError) {
          throw caught;
        }
        if (markerPersisted && isIndeterminateCompletionError(caught)) {
          setCart(null);
          setIndeterminateCompletion(true);
          setError(indeterminateError);
        } else {
          if (markerPersisted) {
            clearStoredCompletionMarker(storeHandle);
          }
          setError(checkoutError);
        }
        throw new Error(checkoutError);
      } finally {
        setPending(false);
      }
    },
    [
      cart,
      checkoutError,
      currency,
      indeterminateError,
      recoveryStorageError,
      storeHandle,
    ],
  );

  const retryCompletion = useCallback(async () => {
    if (!currency) {
      setIndeterminateCompletion(false);
      setError(checkoutError);
      return;
    }

    const marker = readStoredCompletionMarker(storeHandle, currency);

    if (!marker) {
      setIndeterminateCompletion(false);
      setError(checkoutError);
      return;
    }

    setPending(true);
    setError(null);
    try {
      const recovered = await completeStorefrontCart(
        marker.cart_id,
        marker.currency_code,
        marker.payment_method,
      );
      setConfirmation(recovered);
      setCart(null);
      setIndeterminateCompletion(false);
      clearStoredCart();
      clearStoredCompletionMarker(storeHandle);
      navigate("/order-confirmation", { replace: true });
    } catch (caught: unknown) {
      if (isIndeterminateCompletionError(caught)) {
        setIndeterminateCompletion(true);
        setError(indeterminateError);
      } else {
        clearStoredCompletionMarker(storeHandle);
        setIndeterminateCompletion(false);
        setError(checkoutError);
      }
    } finally {
      setPending(false);
    }
  }, [checkoutError, currency, indeterminateError, storeHandle]);

  const value = useMemo<CartContextValue>(
    () => ({
      capability,
      cart,
      confirmation,
      error,
      indeterminateCompletion,
      pending,
      restoring,
      addItem,
      updateQuantity,
      removeItem,
      submitAddress,
      selectShipping,
      completeOrder,
      retryCompletion,
      clearError: () => setError(null),
      clearConfirmation: () => setConfirmation(null),
    }),
    [
      addItem,
      capability,
      cart,
      completeOrder,
      confirmation,
      error,
      indeterminateCompletion,
      pending,
      removeItem,
      retryCompletion,
      restoring,
      selectShipping,
      submitAddress,
      updateQuantity,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const value = useContext(CartContext);
  if (!value) throw new Error("CartProvider is required.");
  return value;
};

export const useOptionalCart = (): CartContextValue | null =>
  useContext(CartContext);
