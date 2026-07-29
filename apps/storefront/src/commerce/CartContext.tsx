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
import type {
  StorefrontCartDto,
  StorefrontCheckoutAddress,
  StorefrontCommerceCapabilitiesDto,
  StorefrontOrderConfirmationDto,
  StorefrontShippingOptionDto,
} from "../types";

const CART_STORAGE_KEY = "labibtech:storefront:cart:v1";

type CartContextValue = {
  capability: StorefrontCommerceCapabilitiesDto;
  cart: StorefrontCartDto | null;
  confirmation: StorefrontOrderConfirmationDto | null;
  error: string | null;
  indeterminateCompletion: boolean;
  pending: boolean;
  restoring: boolean;
  addItem: (variantId: string) => Promise<void>;
  updateQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  submitAddress: (
    address: StorefrontCheckoutAddress,
  ) => Promise<StorefrontShippingOptionDto[]>;
  selectShipping: (optionId: string) => Promise<void>;
  completeOrder: () => Promise<StorefrontOrderConfirmationDto>;
  clearError: () => void;
  clearConfirmation: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const genericError = "تعذّر تحديث السلة الآن. حاول مرة أخرى بعد قليل.";
const checkoutError =
  "تعذّر متابعة إتمام الطلب الآن. راجع بياناتك وحاول مجددًا.";

const availableCurrency = (
  capability: StorefrontCommerceCapabilitiesDto,
): string | null =>
  capability.online_checkout.status === "available"
    ? capability.online_checkout.currency_code
    : null;

const clearStoredCart = () => {
  try {
    window.sessionStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    // Browser storage can be unavailable; the in-memory Cart remains authoritative.
  }
};

const storeCartId = (cartId: string) => {
  try {
    window.sessionStorage.setItem(CART_STORAGE_KEY, cartId);
  } catch {
    // Checkout still works for the current page when storage is unavailable.
  }
};

export const CartProvider = ({
  capability,
  children,
}: {
  capability: StorefrontCommerceCapabilitiesDto;
  children: ReactNode;
}) => {
  const currency = availableCurrency(capability);
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

    if (!currency) {
      setCart(null);
      clearStoredCart();
      setRestoring(false);
      return () => controller.abort();
    }

    let cartId: string | null = null;
    try {
      cartId = window.sessionStorage.getItem(CART_STORAGE_KEY);
    } catch {
      cartId = null;
    }

    if (!cartId) {
      setCart(null);
      setRestoring(false);
      return () => controller.abort();
    }

    setRestoring(true);
    void fetchStorefrontCart(cartId, currency, { signal: controller.signal })
      .then((restored) => {
        if (restored.completed) {
          setCart(null);
          clearStoredCart();
          return;
        }
        setCart(restored);
      })
      .catch((caught: unknown) => {
        if (isStorefrontApiError(caught) && caught.code === "aborted") return;
        setCart(null);
        clearStoredCart();
      })
      .finally(() => {
        if (!controller.signal.aborted) setRestoring(false);
      });

    return () => controller.abort();
  }, [currency]);

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
    [],
  );

  const addItem = useCallback(
    async (variantId: string) => {
      if (!currency) throw new Error(genericError);
      await runMutation(async () => {
        const targetCart = cart ?? (await createStorefrontCart(currency));
        return await addStorefrontCartItem(
          targetCart.id,
          variantId,
          1,
          currency,
        );
      });
    },
    [cart, currency, runMutation],
  );

  const updateQuantity = useCallback(
    async (lineId: string, quantity: number) => {
      if (!cart || !currency) throw new Error(genericError);
      await runMutation(() =>
        updateStorefrontCartItem(cart.id, lineId, quantity, currency),
      );
    },
    [cart, currency, runMutation],
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
    [cart, currency, runMutation],
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
    [cart, currency],
  );

  const selectShipping = useCallback(
    async (optionId: string) => {
      if (!cart || !currency) throw new Error(checkoutError);
      await runMutation(() =>
        selectStorefrontShippingOption(cart.id, optionId, currency),
      );
    },
    [cart, currency, runMutation],
  );

  const completeOrder = useCallback(async () => {
    if (!cart || !currency || !cart.shipping_method_selected) {
      throw new Error(checkoutError);
    }
    setPending(true);
    setError(null);
    setIndeterminateCompletion(false);
    try {
      await prepareStorefrontSystemPayment(cart.id);
      const refreshed = await fetchStorefrontCart(cart.id, currency);
      setCart(refreshed);
      const completed = await completeStorefrontCart(cart.id, currency);
      setConfirmation(completed);
      setCart(null);
      clearStoredCart();
      return completed;
    } catch (caught: unknown) {
      if (
        isStorefrontApiError(caught) &&
        caught.code === "unavailable" &&
        caught.retryable
      ) {
        await fetchStorefrontCart(cart.id, currency)
          .then((latest) => setCart(latest.completed ? null : latest))
          .catch(() => null);
        setIndeterminateCompletion(true);
        setError(
          "لم نتمكن من تأكيد النتيجة. لا تُعِد الإرسال الآن، واطلب المساعدة من المتجر.",
        );
      } else {
        setError(checkoutError);
      }
      throw new Error(checkoutError);
    } finally {
      setPending(false);
    }
  }, [cart, currency]);

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
