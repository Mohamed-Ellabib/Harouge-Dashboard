const MAX_CART_ITEMS = 100;
const MAX_CART_QUANTITY = 99;
const MAX_FAVORITES = 500;

export function normalizeCommerceCartItems(items) {
  const normalizedItems = new Map();

  (Array.isArray(items) ? items : []).slice(0, MAX_CART_ITEMS).forEach((item) => {
    const productId = String(item?.productId || item?.id || '').trim();
    if (!productId) return;

    const quantity = Math.max(1, Math.min(MAX_CART_QUANTITY, Number.parseInt(item?.quantity, 10) || 1));
    const currentQuantity = normalizedItems.get(productId)?.quantity || 0;
    normalizedItems.set(productId, {
      productId,
      quantity: Math.min(MAX_CART_QUANTITY, currentQuantity + quantity),
    });
  });

  return [...normalizedItems.values()].sort((left, right) => left.productId.localeCompare(right.productId));
}

export function normalizeCommerceFavoriteIds(items) {
  return [...new Set((Array.isArray(items) ? items : [])
    .slice(0, MAX_FAVORITES)
    .map((productId) => String(productId || '').trim())
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
}

export function mergeCommerceCartItems(primaryItems, additionalItems) {
  return normalizeCommerceCartItems([
    ...normalizeCommerceCartItems(primaryItems),
    ...normalizeCommerceCartItems(additionalItems),
  ]);
}

export function mergeCommerceCartItemsByMaximum(primaryItems, secondaryItems) {
  const mergedItems = new Map();

  [...normalizeCommerceCartItems(primaryItems), ...normalizeCommerceCartItems(secondaryItems)]
    .forEach((item) => {
      const currentQuantity = mergedItems.get(item.productId)?.quantity || 0;
      mergedItems.set(item.productId, {
        productId: item.productId,
        quantity: Math.max(currentQuantity, item.quantity),
      });
    });

  return [...mergedItems.values()].sort((left, right) => left.productId.localeCompare(right.productId));
}

export function areCommerceCartItemsEqual(leftItems, rightItems) {
  return JSON.stringify(normalizeCommerceCartItems(leftItems))
    === JSON.stringify(normalizeCommerceCartItems(rightItems));
}

export function areCommerceFavoriteIdsEqual(leftItems, rightItems) {
  return JSON.stringify(normalizeCommerceFavoriteIds(leftItems))
    === JSON.stringify(normalizeCommerceFavoriteIds(rightItems));
}

export function createCommerceStatePatch(localState, pendingState) {
  const patch = {};
  if (pendingState?.cart) {
    patch.cartItems = normalizeCommerceCartItems(localState?.cartItems);
  }
  if (pendingState?.favorites) {
    patch.favoriteIds = normalizeCommerceFavoriteIds(localState?.favoriteIds);
  }
  return patch;
}

export function reconcileCustomerCommerceState({
  serverState,
  localState,
  pendingState,
  guestCartItems,
  isInitialized = true,
}) {
  const serverCartItems = normalizeCommerceCartItems(serverState?.cartItems);
  const serverFavoriteIds = normalizeCommerceFavoriteIds(serverState?.favoriteIds);
  const localCartItems = normalizeCommerceCartItems(localState?.cartItems);
  const localFavoriteIds = normalizeCommerceFavoriteIds(localState?.favoriteIds);
  const normalizedGuestItems = normalizeCommerceCartItems(guestCartItems);
  const hasPendingCart = Boolean(pendingState?.cart);
  const hasPendingFavorites = Boolean(pendingState?.favorites);

  const migrationCartItems = isInitialized
    ? serverCartItems
    : mergeCommerceCartItemsByMaximum(serverCartItems, localCartItems);
  const migrationFavoriteIds = isInitialized
    ? serverFavoriteIds
    : normalizeCommerceFavoriteIds([...serverFavoriteIds, ...localFavoriteIds]);
  const cartBase = hasPendingCart ? localCartItems : migrationCartItems;
  const cartItems = normalizedGuestItems.length > 0
    ? mergeCommerceCartItems(cartBase, normalizedGuestItems)
    : cartBase;
  const favoriteIds = hasPendingFavorites ? localFavoriteIds : migrationFavoriteIds;
  const shouldMigrateCart = !isInitialized
    && !areCommerceCartItemsEqual(migrationCartItems, serverCartItems);
  const shouldMigrateFavorites = !isInitialized
    && !areCommerceFavoriteIdsEqual(migrationFavoriteIds, serverFavoriteIds);

  return {
    cartItems,
    favoriteIds,
    shouldSyncCart: hasPendingCart || normalizedGuestItems.length > 0 || shouldMigrateCart,
    shouldSyncFavorites: hasPendingFavorites || shouldMigrateFavorites,
    shouldSync: hasPendingCart
      || hasPendingFavorites
      || normalizedGuestItems.length > 0
      || shouldMigrateCart
      || shouldMigrateFavorites,
  };
}
