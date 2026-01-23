import { cookies } from "next/headers";

export const COOKIE_NAME = "cookie_consent";

export type ConsentState = {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

const defaultConsent: ConsentState = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

/**
 * Get cookie consent from server-side cookies
 * Use this in Server Components, Server Actions, and Route Handlers
 */
export async function getConsent(): Promise<ConsentState> {
  const cookieStore = await cookies();
  const consentCookie = cookieStore.get(COOKIE_NAME);

  if (!consentCookie?.value) {
    return defaultConsent;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(consentCookie.value));
    return {
      necessary: parsed.necessary ?? true,
      functional: parsed.functional ?? false,
      analytics: parsed.analytics ?? false,
      marketing: parsed.marketing ?? false,
    };
  } catch (error) {
    console.error("Error parsing consent cookie:", error);
    return defaultConsent;
  }
}

/**
 * Check if user has consented to a specific category
 */
export async function hasConsentedTo(category: keyof ConsentState): Promise<boolean> {
  const consent = await getConsent();
  return consent[category];
}

/**
 * Check if user has interacted with the consent banner
 */
export async function hasInteracted(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.has(COOKIE_NAME);
}
