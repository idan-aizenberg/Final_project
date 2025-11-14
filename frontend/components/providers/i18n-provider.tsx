"use client";

import { ReactNode } from "react";
import { I18nContext, type Locale, type Messages, dictionaries } from "@/lib/i18n";
import { useMemo, useState } from "react";

interface I18nProviderProps {
  children: ReactNode;
  defaultLocale?: Locale;
}

export function I18nProvider({ children, defaultLocale = "en" }: I18nProviderProps) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  const value = useMemo(
    () => ({
      locale,
      messages: dictionaries[locale],
      setLocale,
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}