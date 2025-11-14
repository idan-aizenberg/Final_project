"use client";

import { createContext, useContext } from "react";

export type Locale = "en";

export interface Messages {
  common: {
    getStarted: string;
    pricing: string;
    docs: string;
    signIn: string;
    signUp: string;
    dashboard: string;
  };
}

export interface I18nContextValue {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => void;
}

export const dictionaries: Record<Locale, Messages> = {
  en: {
    common: {
      getStarted: "Get Started",
      pricing: "Pricing",
      docs: "Docs",
      signIn: "Sign in",
      signUp: "Sign up",
      dashboard: "Dashboard",
    },
  },
};

export const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

export function t(path: keyof Messages["common"], locale: Locale = "en") {
  return dictionaries[locale].common[path];
}
