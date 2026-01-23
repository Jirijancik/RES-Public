"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { usePathname } from "next/navigation";
import { createContext, useState } from "react";
import { I18nextProvider } from "react-i18next";

import { CookieContextProvider } from "@/components/cookies/cookie-context";
import { getQueryClient } from "@/lib/query-client";
import i18n from "@/locales";

export const AppContext = createContext<{ previousPathname?: string }>({});

function usePrevious<T>(value: T): T | undefined {
  const [current, setCurrent] = useState(value);
  const [previous, setPrevious] = useState<T | undefined>();

  if (current !== value) {
    setPrevious(current);
    setCurrent(value);
  }

  return previous;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const previousPathname = usePrevious(pathname);
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <AppContext.Provider value={{ previousPathname: previousPathname ?? undefined }}>
          <CookieContextProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </CookieContextProvider>
        </AppContext.Provider>
      </I18nextProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
