import type { Metadata } from "next";
import { CompanyDetailPage } from "@/components/company";
import { site } from "@/config/site";

type PageProps = {
  params: Promise<{ ico: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ico } = await params;
  const title = `Firma ${ico}`;

  return {
    title,
    alternates: {
      canonical: `/company/${ico}`,
    },
    openGraph: {
      title: `${title} | ${site.name}`,
      url: `${site.url}/company/${ico}`,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { ico } = await params;

  return <CompanyDetailPage ico={ico} />;
}
