import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { StorefrontProductCardDto } from "../types";
import { resolvePreviewFavorites } from "./preview-favorites";

type FavoritesContextValue = {
  favorites: StorefrontProductCardDto[];
  isFavorite: (handle: string) => boolean;
  toggleFavorite: (product: StorefrontProductCardDto) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);
const storageKey = (storeHandle: string) =>
  `labibtech:storefront:favorites:v1:${storeHandle}`;

const readFavorites = (storeHandle: string): StorefrontProductCardDto[] => {
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey(storeHandle)) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter(
      (entry): entry is StorefrontProductCardDto =>
        typeof entry === "object" &&
        entry !== null &&
        typeof entry.handle === "string" &&
        typeof entry.title === "string",
    );
  } catch {
    return [];
  }
};

const PersistentFavoritesProvider = ({
  children,
  storeHandle,
}: {
  children: ReactNode;
  storeHandle: string;
}) => {
  const [favorites, setFavorites] = useState<StorefrontProductCardDto[]>(() =>
    readFavorites(storeHandle),
  );

  useEffect(() => setFavorites(readFavorites(storeHandle)), [storeHandle]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey(storeHandle), JSON.stringify(favorites));
    } catch {
      // Favorites still work in memory when browser storage is unavailable.
    }
  }, [favorites, storeHandle]);

  const toggleFavorite = useCallback((product: StorefrontProductCardDto) => {
    setFavorites((current) =>
      current.some((entry) => entry.handle === product.handle)
        ? current.filter((entry) => entry.handle !== product.handle)
        : [product, ...current],
    );
  }, []);

  const handles = useMemo(
    () => new Set(favorites.map((product) => product.handle)),
    [favorites],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favorites,
      isFavorite: (handle) => handles.has(handle),
      toggleFavorite,
    }),
    [favorites, handles, toggleFavorite],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

function PreviewFavoritesProvider({ children, products }: { children: ReactNode; products: StorefrontProductCardDto[] }) {
  // One isolated sample selection per editor session; never read/write customer storage.
  // Emptying it deliberately must stay empty when navigating or editing the draft.
  const [selected, setSelected] = useState(() => products.slice(0, 4).map(product => product.handle));
  const favorites = useMemo(() => resolvePreviewFavorites(products, selected), [products, selected]);
  const handles = useMemo(() => new Set(favorites.map(product => product.handle)), [favorites]);
  const toggleFavorite = useCallback((product: StorefrontProductCardDto) => {
    setSelected(current => current.includes(product.handle)
      ? current.filter(handle => handle !== product.handle)
      : [...current, product.handle]);
  }, []);
  const value = useMemo<FavoritesContextValue>(() => ({ favorites, isFavorite: handle => handles.has(handle), toggleFavorite }), [favorites, handles, toggleFavorite]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function FavoritesProvider({ children, storeHandle, previewProducts }: {
  children: ReactNode; storeHandle: string; previewProducts?: StorefrontProductCardDto[];
}) {
  return previewProducts !== undefined
    ? <PreviewFavoritesProvider key={`preview:${storeHandle}`} products={previewProducts}>{children}</PreviewFavoritesProvider>
    : <PersistentFavoritesProvider key={`customer:${storeHandle}`} storeHandle={storeHandle}>{children}</PersistentFavoritesProvider>;
}

export const useFavorites = () => {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error("FavoritesProvider is required.");
  return value;
};

export const useOptionalFavorites = () => useContext(FavoritesContext);
