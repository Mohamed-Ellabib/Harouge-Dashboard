export const languageStorageKey = "itdcc.ui.language";

export const supportedLanguages = ["en", "ar"] as const;

export type AppLanguage = (typeof supportedLanguages)[number];

export const defaultLanguage: AppLanguage = "en";

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  const storage = window.localStorage;

  if (
    storage &&
    typeof storage.getItem === "function" &&
    typeof storage.setItem === "function"
  ) {
    return storage;
  }

  return null;
}

export function normalizeLanguage(value: string | null | undefined): AppLanguage {
  if (value === "ar") {
    return "ar";
  }

  return "en";
}

export function readStoredLanguage(): AppLanguage {
  const storage = getStorage();

  if (!storage) {
    return defaultLanguage;
  }

  try {
    return normalizeLanguage(storage.getItem(languageStorageKey));
  } catch {
    return defaultLanguage;
  }
}

export function persistLanguage(language: AppLanguage) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(languageStorageKey, language);
  } catch {
    return;
  }
}

export function getLanguageDirection(language: AppLanguage) {
  return language === "ar" ? "rtl" : "ltr";
}
