import type { Metadata } from "next";
import { JusticeDetail } from "@/components/justice";
import { site } from "@/config/site";

type PageProps = {
  params: Promise<{ ico: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ico } = await params;
  const title = `Entity ${ico}`;

  return {
    title,
    alternates: {
      canonical: `/justice/${ico}`,
    },
    openGraph: {
      title: `${title} | ${site.name}`,
      url: `${site.url}/justice/${ico}`,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { ico } = await params;

  return <JusticeDetail ico={ico} />;
}
