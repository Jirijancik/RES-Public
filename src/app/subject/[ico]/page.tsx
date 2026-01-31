import type { Metadata } from "next";
import { SubjectDetail } from "@/components/subject";
import { site } from "@/config/site";

type PageProps = {
  params: Promise<{ ico: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ico } = await params;
  const title = `Subject ${ico}`;

  return {
    title,
    alternates: {
      canonical: `/subject/${ico}`,
    },
    openGraph: {
      title: `${title} | ${site.name}`,
      url: `${site.url}/subject/${ico}`,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { ico } = await params;

  return <SubjectDetail ico={ico} />;
}
