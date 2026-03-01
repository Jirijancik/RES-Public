import type { Metadata } from "next";
import { CompanySearchPage } from "@/components/company";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export default function Page() {
  return <CompanySearchPage />;
}
