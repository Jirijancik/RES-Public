"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCookieContext } from "./cookie-context";

/**
 * Client component that reloads the page when consent changes
 * This ensures third-party scripts are loaded/unloaded based on new consent
 */
export function DynamicScripts() {
  const { consent, hasInteracted, isMounted } = useCookieContext();
  const router = useRouter();

  useEffect(() => {
    // Skip on initial mount
    if (!isMounted || !hasInteracted) {
      return;
    }

    // Store the current consent to detect changes
    const consentKey = "consent_change_check";
    const storedConsent = sessionStorage.getItem(consentKey);
    const currentConsent = JSON.stringify(consent);

    if (storedConsent && storedConsent !== currentConsent) {
      // Consent changed - refresh to apply new script settings
      sessionStorage.setItem(consentKey, currentConsent);
      router.refresh();
    } else if (!storedConsent) {
      // First time - just store it
      sessionStorage.setItem(consentKey, currentConsent);
    }
  }, [consent, hasInteracted, isMounted, router]);

  return null;
}
