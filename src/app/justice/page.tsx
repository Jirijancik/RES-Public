import type { Metadata } from "next";
import { JusticePage } from "@/components/justice";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Justice Registry",
  description: "Search entities in the Czech Commercial Registry",
  alternates: {
    canonical: "/justice",
  },
  openGraph: {
    title: `Justice Registry | ${site.name}`,
    url: `${site.url}/justice`,
  },
};

export default function Page() {
  return <JusticePage />;
}
