import { CookieSettingsTrigger } from "./cookie-settings-trigger";

// Define the shape of a single cookie object
type CookieCategory = "essential" | "functional" | "analytics" | "marketing";

export type Cookie = {
  name: string;
  provider: string;
  purpose: string;
  duration: string;
  category: CookieCategory;
  storageType?: "cookie" | "localStorage" | "sessionStorage";
};

type Locale = "cs" | "en";

// Define the component's props
type CookiePolicyProps = React.ComponentProps<"div"> & {
  /** Company information */
  company: {
    name: string;
    address: string;
    id: string;
    domain: string;
  };
  /** Contact information */
  contact: {
    email: string;
    phone?: string;
  };
  /** Array of cookie objects to display in the policy */
  cookies?: Cookie[];
  /** Last updated date of the document */
  lastUpdated?: string;
  /** Effective date of the document */
  effectiveDate?: string;
  /** Language of the statement ("cs" or "en") */
  locale?: Locale;
  /** Optional node for custom info on managing cookies (e.g., a button to open settings) */
  cookieManagementInfo?: React.ReactNode;
};

// Default data (example cookies) if none are provided
const defaultData: Record<Locale, { cookies: Cookie[] }> = {
  cs: {
    cookies: [
      {
        name: "_ga",
        provider: "Google Analytics",
        purpose: "Používá se k rozlišení uživatelů pro statistické účely.",
        duration: "2 roky",
        category: "analytics",
        storageType: "cookie",
      },
    ],
  },
  en: {
    cookies: [
      {
        name: "_ga",
        provider: "Google Analytics",
        purpose: "Used to distinguish users for statistical purposes.",
        duration: "2 years",
        category: "analytics",
        storageType: "cookie",
      },
    ],
  },
};

// All static text and translations
const translations = {
  cs: {
    title: "Zásady používání souborů cookie",
    effectiveFrom: "Účinné od:",
    lastUpdated: "Poslední aktualizace:",
    introTitle: "1. Úvod",
    introText:
      "Tyto Zásady používání souborů cookie vysvětlují, jaké soubory cookie používáme na našich webových stránkách",
    whatAreCookiesTitle: "2. Co jsou soubory cookie?",
    whatAreCookiesText:
      "Soubory cookie jsou malé textové soubory, které se ukládají do vašeho zařízení (počítače, mobilního telefonu) při návštěvě webových stránek. Kromě cookies můžeme také používat localStorage a sessionStorage pro ukládání dat přímo ve vašem prohlížeči. Pomáhají nám zajistit správné fungování stránek, zvýšit jejich bezpečnost, analyzovat návštěvnost a zlepšovat uživatelský komfort.",
    howWeUseCookiesTitle: "3. Jak používáme soubory cookie?",
    howWeUseCookiesText:
      "Naše webové stránky používají soubory cookie první strany i třetích stran pro několik účelů. Soubory cookie první strany jsou většinou nezbytné pro správné fungování webu a neshromažďují žádné vaše osobní údaje. Soubory cookie třetích stran používáme především k analýze návštěvnosti, marketingovým účelům a integraci sociálních médií.",
    typesOfCookiesTitle: "4. Typy souborů cookie, které používáme",
    tableHeadName: "Název",
    tableHeadProvider: "Poskytovatel",
    tableHeadPurpose: "Účel",
    tableHeadDuration: "Doba platnosti",
    tableHeadStorageType: "Typ úložiště",
    category: {
      essential: "Nezbytné soubory cookie",
      functional: "Funkční soubory cookie",
      analytics: "Analytické soubory cookie",
      marketing: "Marketingové soubory cookie",
    },
    manageTitle: "5. Jak spravovat preference úložišť?",
    manageText:
      "Své preference můžete kdykoli změnit pomocí tlačítka níže nebo prostřednictvím nastavení vašeho webového prohlížeče. Můžete blokovat nebo mazat soubory cookie, localStorage i sessionStorage data. Upozorňujeme, že omezení těchto technologií může ovlivnit funkčnost těchto webových stránek.",
    manageButton: "Změnit nastavení cookies",
    contactTitle: "6. Kontaktujte nás",
    contactText:
      "Pokud máte jakékoli dotazy týkající se těchto zásad, můžete nás kontaktovat na e-mailové adrese:",
    contactPhone: "nebo na telefonním čísle:",
  },
  en: {
    title: "Cookie Policy",
    effectiveFrom: "Effective from:",
    lastUpdated: "Last updated:",
    introTitle: "1. Introduction",
    introText: "This Cookie Policy explains what cookies are and how we use them on our website",
    whatAreCookiesTitle: "2. What Are Cookies?",
    whatAreCookiesText:
      "Cookies are small text files that are stored on your device (computer, mobile phone) when you visit a website. In addition to cookies, we may also use localStorage and sessionStorage to store data directly in your browser. They help us ensure the website functions correctly, make it more secure, understand how it performs, and analyze what works and where it needs improvement.",
    howWeUseCookiesTitle: "3. How We Use Cookies",
    howWeUseCookiesText:
      "Our website uses first-party and third-party cookies for several purposes. First-party cookies are mostly necessary for the website to function the right way, and they do not collect any of your personally identifiable data. The third-party cookies used on our website are mainly for understanding how the website performs, how you interact with our website, keeping our services secure, providing advertisements that are relevant to you, and all in all providing you with a better and improved user experience.",
    typesOfCookiesTitle: "4. Types of Cookies We Use",
    tableHeadName: "Name",
    tableHeadProvider: "Provider",
    tableHeadPurpose: "Purpose",
    tableHeadDuration: "Duration",
    tableHeadStorageType: "Storage Type",
    category: {
      essential: "Essential Cookies",
      functional: "Functional Cookies",
      analytics: "Analytics Cookies",
      marketing: "Marketing Cookies",
    },
    manageTitle: "5. How to Manage Your Cookie Preferences",
    manageText:
      "You can manage your cookie preferences at any time using the button below or through your web browser settings. You can block or delete cookies as you wish. Please be aware that restricting cookies may impact the functionality of this website.",
    manageButton: "Change Cookie Settings",
    contactTitle: "6. Contact Us",
    contactText: "If you have any questions about this Cookie Policy, you can contact us at:",
    contactPhone: "or by phone:",
  },
};

export function CookiePolicy({
  company,
  contact,
  cookies,
  lastUpdated,
  effectiveDate,
  locale = "cs",
  cookieManagementInfo,
  ...props
}: CookiePolicyProps) {
  const t = translations[locale];
  const defaults = defaultData[locale];

  // Use provided cookies or fallback to default examples
  const actualCookies = cookies || defaults.cookies;

  // Group cookies by category for structured display
  const groupedCookies = actualCookies.reduce(
    (acc, cookie) => {
      acc[cookie.category] = acc[cookie.category] || [];
      acc[cookie.category].push(cookie);
      return acc;
    },
    {} as Record<CookieCategory, Cookie[]>
  );

  return (
    <div {...props}>
      {effectiveDate && (
        <p className="text-sm opacity-60">
          {t.effectiveFrom} {effectiveDate}
        </p>
      )}
      {lastUpdated && (
        <p className="text-sm opacity-60">
          {t.lastUpdated} {lastUpdated}
        </p>
      )}

      <section>
        <h2>{t.introTitle}</h2>
        <p>
          {t.introText} <strong>{company.domain}</strong>.
        </p>
      </section>

      <section>
        <h2>{t.whatAreCookiesTitle}</h2>
        <p>{t.whatAreCookiesText}</p>
      </section>

      <section>
        <h2>{t.howWeUseCookiesTitle}</h2>
        <p>{t.howWeUseCookiesText}</p>
      </section>

      <section>
        <h2>{t.typesOfCookiesTitle}</h2>
        {(Object.keys(groupedCookies) as CookieCategory[]).map((category) => (
          <div key={category} className="mb-8">
            <h3>{t.category[category]}</h3>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>{t.tableHeadName}</th>
                    <th>{t.tableHeadProvider}</th>
                    <th>{t.tableHeadPurpose}</th>
                    <th>{t.tableHeadDuration}</th>
                    <th>{t.tableHeadStorageType}</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedCookies[category].map((cookie) => (
                    <tr key={cookie.name}>
                      <td>{cookie.name}</td>
                      <td>{cookie.provider}</td>
                      <td>{cookie.purpose}</td>
                      <td>{cookie.duration}</td>
                      <td>{cookie.storageType || "cookie"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2>{t.manageTitle}</h2>
        <p>{t.manageText}</p>
        <div className="mt-4">
          <CookieSettingsTrigger className="cursor-pointer font-medium underline underline-offset-2">
            {t.manageButton}
          </CookieSettingsTrigger>
        </div>
        {cookieManagementInfo && <div className="mt-4">{cookieManagementInfo}</div>}
      </section>

      <section>
        <h2>{t.contactTitle}</h2>
        <p>
          {t.contactText} <strong>{contact.email}</strong>
          {contact.phone && (
            <>
              {" "}
              {t.contactPhone} <strong>{contact.phone}</strong>
            </>
          )}
          .
        </p>
      </section>
    </div>
  );
}
