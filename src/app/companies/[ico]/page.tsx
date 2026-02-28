import type { Metadata } from "next";
import { CompanyDetail } from "@/components/company";
import { site } from "@/config/site";

type PageProps = {
  params: Promise<{ ico: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ico } = await params;
  const title = `Company ${ico}`;

  return {
    title,
    alternates: {
      canonical: `/companies/${ico}`,
    },
    openGraph: {
      title: `${title} | ${site.name}`,
      url: `${site.url}/companies/${ico}`,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { ico } = await params;

  return <CompanyDetail ico={ico} />;
}
