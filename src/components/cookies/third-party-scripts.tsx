import { getConsent } from "./server-utils";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";

export async function ThirdPartyScripts() {
  const consent = await getConsent();

  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

  return (
    <>
      {consent.analytics && gaId && <GoogleAnalytics gaId={gaId} />}
      {consent.analytics && gtmId && <GoogleTagManager gtmId={gtmId} />}
    </>
  );
}
