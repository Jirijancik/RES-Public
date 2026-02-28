import type { Metadata } from "next";
import { CompanySearch } from "@/components/company/company-search";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Company Search",
  alternates: {
    canonical: "/companies/search",
  },
  openGraph: {
    title: `Company Search | ${site.name}`,
    url: `${site.url}/companies/search`,
  },
};

export default function CompanySearchPage() {
  return <CompanySearch />;
}
