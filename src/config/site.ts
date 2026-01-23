export const site = {
  name: "GTDN",
  defaultTitle: "Next.js Starter Template",
  defaultDescription:
    "Modern web application starter template built with Next.js 16, TypeScript, shadcn/ui and with a lot of built-in features.",
  domain: "gtdn.online",
  url: "https://www.gtdn.online",
  locale: "cs",
  defaultLocale: "cs",
  locales: ["cs", "en"] as const,
};

export type SupportedLocale = (typeof site.locales)[number];
