export const site = {
  name: "GTDN",
  defaultTitle: "Registr firem | GTDN",
  defaultDescription:
    "Vyhledávání a přehled českých firem z veřejných rejstříků",
  domain: "gtdn.online",
  url: "https://www.gtdn.online",
  locale: "cs",
  defaultLocale: "cs",
  locales: ["cs", "en"] as const,
};

export type SupportedLocale = (typeof site.locales)[number];
