import type { Metadata } from "next";
import { site } from "@/config/site";
import { HomePage } from "@/components/home";

export const metadata: Metadata = {
  title: site.defaultTitle,
  description: site.defaultDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: site.defaultTitle,
    description: site.defaultDescription,
    url: site.url,
  },
  twitter: {
    title: site.defaultTitle,
    description: site.defaultDescription,
  },
};

export default function Page() {
  return <HomePage />;
}
