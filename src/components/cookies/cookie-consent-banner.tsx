"use client";

import { Button } from "../ui/button";
import { useCookieContext } from "./cookie-context";

export function CookieConsentBanner() {
  const { hasInteracted, isMounted, saveConsent, openSettingsDialog } = useCookieContext();

  if (!isMounted || hasInteracted) {
    return null;
  }

  function handleDeny() {
    saveConsent({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    });
  }

  function handleAcceptAll() {
    saveConsent({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    });
  }

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 z-50 w-screen max-w-lg px-5 pb-3">
      <div className="bg-background text-foreground border-border pointer-events-auto grid w-full gap-5 rounded-xl border p-4 shadow-md dark:shadow-none">
        <div>
          <p>
            We use cookies to enhance your browsing experience, analyze site traffic, and provide
            personalized content. You can choose to accept all cookies or customize your
            preferences.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-start gap-3">
          <Button variant="secondary" size="sm" onClick={handleDeny}>
            Deny
          </Button>
          <Button variant="secondary" size="sm" onClick={handleAcceptAll}>
            Accept all
          </Button>
          <Button size="sm" className="sm:ml-auto sm:justify-self-end" onClick={openSettingsDialog}>
            Consent settings
          </Button>
        </div>
      </div>
    </div>
  );
}
