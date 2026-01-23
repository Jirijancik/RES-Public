import type { Cookie } from "@/components/cookies/cookie-policy";

export const cookies: Cookie[] = [
  // Essential Cookies
  {
    name: "cookie_consent",
    provider: "Own",
    purpose: "Stores cookie consent preferences.",
    duration: "1 year",
    category: "essential",
    storageType: "cookie",
  },

  // Functional Storage
  {
    name: "theme",
    provider: "Own",
    purpose: "Stores theme preference (system/light/dark mode).",
    duration: "Persistent",
    category: "functional",
    storageType: "localStorage",
  },
  {
    name: "consent_change_check",
    provider: "Own",
    purpose: "Tracks consent changes to refresh scripts.",
    duration: "Session",
    category: "functional",
    storageType: "sessionStorage",
  },

  // Analytics Cookies (Google Analytics - only loaded when analytics consent is given)
  {
    name: "_ga",
    provider: "Google Analytics",
    purpose: "Distinguishes users for analytics (with consent).",
    duration: "2 years",
    category: "analytics",
    storageType: "cookie",
  },
  {
    name: "_ga_*",
    provider: "Google Analytics",
    purpose: "Persists GA4 session state (with consent).",
    duration: "2 years",
    category: "analytics",
    storageType: "cookie",
  },
  {
    name: "_gid",
    provider: "Google Analytics",
    purpose: "Distinguishes users for 24 hours (with consent).",
    duration: "24 hours",
    category: "analytics",
    storageType: "cookie",
  },
  {
    name: "_gat",
    provider: "Google Analytics",
    purpose: "Throttles GA request rate (with consent).",
    duration: "1 minute",
    category: "analytics",
    storageType: "cookie",
  },

  // Google Tag Manager Cookies (only loaded when analytics consent is given)
  {
    name: "_gcl_au",
    provider: "Google Tag Manager",
    purpose: "AdSense efficiency experiments (with consent).",
    duration: "3 months",
    category: "analytics",
    storageType: "cookie",
  },
];
