"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const COOKIE_NAME = "cookie_consent";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

// Enable logging of the current state and always display the consent banner
const DEBUG_MODE = false;

type ConsentState = {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

type CookieContextType = {
  // Current consent preferences
  consent: ConsentState;
  // Check if user has consented to a specific category
  hasConsentedTo: (category: keyof ConsentState) => boolean;
  // Update a specific consent category preference
  updateConsent: (category: keyof ConsentState, value: boolean) => void;
  // Save current consent preferences to storage
  saveConsent: (consentToSave?: ConsentState) => void;
  // Whether the user has interacted with the consent banner
  hasInteracted: boolean;
  // Whether the context has mounted and loaded from storage
  isMounted: boolean;
  // Whether the settings dialog is open
  isSettingsOpen: boolean;
  // Open the settings dialog
  openSettingsDialog: () => void;
  // Close the settings dialog
  closeSettingsDialog: () => void;
};

const CookieContext = createContext<CookieContextType | undefined>(undefined);

const initialConsent: ConsentState = {
  necessary: true, // Necessary cookies are always enabled
  functional: false,
  analytics: false,
  marketing: false,
};

function getConsentFromCookie(): ConsentState | null {
  if (typeof document === "undefined") {
    return null;
  }

  try {
    const cookies = document.cookie.split("; ");
    const consentCookie = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));

    if (!consentCookie) {
      return null;
    }

    const value = consentCookie.split("=")[1];
    return JSON.parse(decodeURIComponent(value));
  } catch (error) {
    console.error("Error reading consent cookie:", error);
    return null;
  }
}

function setConsentCookie(consent: ConsentState): void {
  if (typeof document === "undefined") {
    return;
  }

  try {
    const value = encodeURIComponent(JSON.stringify(consent));
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE_NAME}=${value}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
  } catch (error) {
    console.error("Error setting consent cookie:", error);
  }
}

// For safety the cookie consent works normally in production
const ENABLE_DEBUG_MODE = process.env.NODE_ENV === "development" && DEBUG_MODE;

export function CookieContextProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentState>(initialConsent);
  const [isMounted, setIsMounted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const storedConsent = getConsentFromCookie();
    const hasStored = storedConsent !== null;

    // Defer state updates to avoid synchronous setState in effect
    Promise.resolve().then(() => {
      if (hasStored) {
        setConsent(storedConsent);
      }

      setHasInteracted(ENABLE_DEBUG_MODE ? false : hasStored);
      setIsMounted(true);
    });
  }, []);

  // Debug mode: log state changes
  useEffect(() => {
    if (ENABLE_DEBUG_MODE && isMounted) {
      // eslint-disable-next-line no-console
      console.log("Cookie Consent State:", {
        consent,
        hasInteracted,
        isSettingsOpen,
      });
    }
  }, [consent, hasInteracted, isSettingsOpen, isMounted]);

  function updateConsent(category: keyof ConsentState, value: boolean) {
    if (category === "necessary") return;
    setConsent((prev) => ({ ...prev, [category]: value }));
  }

  function saveConsent(consentToSave?: ConsentState) {
    const finalConsent = consentToSave || consent;
    setConsentCookie(finalConsent);
    setConsent(finalConsent);
    setHasInteracted(true);
  }

  function hasConsentedTo(category: keyof ConsentState): boolean {
    return isMounted && consent[category];
  }

  function openSettingsDialog() {
    setIsSettingsOpen(true);
  }

  function closeSettingsDialog() {
    setIsSettingsOpen(false);
  }

  return (
    <CookieContext.Provider
      value={{
        consent,
        hasConsentedTo,
        updateConsent,
        saveConsent,
        hasInteracted,
        isMounted,
        isSettingsOpen,
        openSettingsDialog,
        closeSettingsDialog,
      }}
    >
      {children}
    </CookieContext.Provider>
  );
}

export function useCookieContext() {
  const context = useContext(CookieContext);
  if (context === undefined) {
    throw new Error("useCookieContext must be used within a CookieProvider");
  }
  return context;
}
