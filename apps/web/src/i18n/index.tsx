import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";

import {
  getLanguageDirection,
  persistLanguage,
  readStoredLanguage,
  type AppLanguage
} from "./locale";
import { messages, type TranslationTree } from "./messages";

type Primitive = string | number | boolean | null | undefined;

type I18nContextValue = {
  direction: "ltr" | "rtl";
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: string, values?: Record<string, Primitive>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function resolveMessage(tree: TranslationTree, key: string) {
  return key.split(".").reduce<string | TranslationTree | undefined>(
    (current, segment) => {
      if (!current || typeof current === "string") {
        return undefined;
      }

      return current[segment] as string | TranslationTree | undefined;
    },
    tree
  );
}

function interpolate(template: string, values?: Record<string, Primitive>) {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, token: string) => {
    const value = values[token];
    return value === null || value === undefined ? "" : String(value);
  });
}

export function translate(
  language: AppLanguage,
  key: string,
  values?: Record<string, Primitive>
) {
  const resolved = resolveMessage(messages[language], key) ?? resolveMessage(messages.en, key);

  if (typeof resolved !== "string") {
    return key;
  }

  return interpolate(resolved, values);
}

export function I18nProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<AppLanguage>(() =>
    readStoredLanguage()
  );

  useEffect(() => {
    persistLanguage(language);
    document.documentElement.lang = language;
    document.documentElement.dir = getLanguageDirection(language);
  }, [language]);

  const value = useMemo<I18nContextValue>(() => {
    const direction = getLanguageDirection(language);

    return {
      direction,
      language,
      setLanguage: (nextLanguage) => setLanguageState(nextLanguage),
      t: (key, values) => translate(language, key, values)
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider.");
  }

  return context;
}
