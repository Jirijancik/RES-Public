# Cookie Consent System

Privacy-first cookie consent for Next.js 15+ App Router with SSR support.

## File Overview

```
src/components/cookies/
├── cookie-context.tsx              # Client state + React Context hook
├── server-utils.ts                 # Server-side consent reading
├── third-party-scripts.tsx         # Add your GA/GTM scripts here
├── dynamic-scripts.tsx             # Auto-refresh on consent change
├── cookie-consent-banner.tsx       # Initial consent banner UI
├── cookie-settings-dialog.tsx      # Detailed preferences - dialog with settings UI
├── cookie-settings-trigger.tsx     # Reusable unstyled button, that will trigger the settings dialog to open state
├── cookie-error-boundary.tsx       # Error handling wrapper
└── cookie-policy.tsx               # Cookie policy table component

src/config/
└── cookies.ts                      # Cookie configuration - define all cookies here

src/app/cookies/
└── page.tsx                        # Cookie policy page (app/cookies route)
```

### What Each File Does

**`cookie-context.tsx`** - Manages consent state (client-side)

- Reads/writes `cookie_consent` cookie
- Provides `useCookieContext()` hook

**`server-utils.ts`** - Read consent in Server Components

- `getConsent()` - Get full consent object
- `hasConsentedTo(category)` - Check specific permission

**`third-party-scripts.tsx`** - **YOUR TRACKING SCRIPTS GO HERE**

- Server Component that conditionally loads GA/GTM
- Only renders scripts if user consented

**`dynamic-scripts.tsx`** - Refreshes page when consent changes

## Setup (3 Steps)

### 1. Root Layout

```tsx
// app/layout.tsx
import { Suspense } from "react";
import { CookieConsentBanner } from "@/components/cookies/cookie-consent-banner";
import { CookieSettingsDialog } from "@/components/cookies/cookie-settings-dialog";
import { CookieErrorBoundary } from "@/components/cookies/cookie-error-boundary";
import { DynamicScripts } from "@/components/cookies/dynamic-scripts";
import { ThirdPartyScripts } from "@/components/cookies/third-party-scripts";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>
          {children}

          <CookieErrorBoundary>
            <CookieConsentBanner />
            <CookieSettingsDialog />
            <DynamicScripts />
          </CookieErrorBoundary>
        </Providers>

        <Suspense fallback={null}>
          <ThirdPartyScripts />
        </Suspense>
      </body>
    </html>
  );
}
```

### 2. Context Provider

```tsx
// components/layout/providers.tsx
import { CookieContextProvider } from "@/components/cookies/cookie-context";

export function Providers({ children }) {
  return <CookieContextProvider>{children}</CookieContextProvider>;
}
```

### 3. Environment Variables

```env
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

## Usage

### Client Components

```tsx
"use client";
import { useCookieContext } from "@/components/cookies/cookie-context";

function MyComponent() {
  const { hasConsentedTo, openSettingsDialog } = useCookieContext();

  if (hasConsentedTo("analytics")) {
    // Load analytics
  }

  return <button onClick={openSettingsDialog}>Cookie Settings</button>;
}
```

### Server Components

```tsx
import { getConsent, hasConsentedTo } from "@/components/cookies/server-utils";

async function MyPage() {
  const consent = await getConsent();
  const hasAnalytics = await hasConsentedTo("analytics");

  return <div>{hasAnalytics ? "Tracking on" : "Tracking off"}</div>;
}
```

### Settings Button (Footer)

```tsx
import { CookieSettingsTrigger } from "@/components/cookies/cookie-settings-trigger";

<CookieSettingsTrigger>
  <button>Manage Cookies</button>
</CookieSettingsTrigger>;
```

## Consent Categories

- **necessary** - Always on (auth, session)
- **functional** - Theme, language preferences
- **analytics** - GA, GTM, usage tracking
- **marketing** - Ads, remarketing pixels

## Add Tracking Scripts

Edit `third-party-scripts.tsx`:

```tsx
import { getConsent } from "./server-utils";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";

export async function ThirdPartyScripts() {
  const consent = await getConsent();

  return (
    <>
      {consent.analytics && process.env.NEXT_PUBLIC_GA_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      )}

      {consent.analytics && process.env.NEXT_PUBLIC_GTM_ID && (
        <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} />
      )}
    </>
  );
}
```

## Cookie Policy Page

The cookie policy page (`app/cookies/page.tsx`) displays a comprehensive overview of all cookies used on your site. It includes a hero section and renders a detailed table of cookies from the configuration.

```tsx
// app/cookies/page.tsx
import { CookiePolicy } from "@/components/cookies/cookie-policy";
import { cookies } from "@/config/cookies";

export default function Page() {
  return (
    <CookiePolicy
      cookies={cookies}
      company={{ name: "Your Co", domain: "example.com" }}
      contact={{ email: "privacy@example.com" }}
    />
  );
}
```

### Cookie Configuration

**Update `config/cookies.ts` with your complete cookie list.** This file contains all cookies used by your site, organized by category:

- **Essential** - Required for basic site functionality
- **Functional** - Enhance user experience (theme, language)
- **Analytics** - Track usage and performance
- **Marketing** - Advertising and remarketing

The configuration automatically generates the cookie policy table, so keep this file updated whenever you add new tracking scripts or cookies.

## How It Works

1. First visit → No cookie → Banner shows
2. User chooses → Cookie saved → Page refreshes
3. Scripts load based on consent
4. Return visits → Scripts render server-side

## Debug Mode

Always show banner in development:

```tsx
// cookie-context.tsx (line ~8)
const DEBUG_MODE = true;
```

## Troubleshooting

**Banner not showing?** Delete `cookie_consent` cookie to test

**Scripts not loading?** Check env vars and consent in DevTools → Application → Cookies

**Hydration errors?** Check `isMounted` before rendering consent-dependent content
