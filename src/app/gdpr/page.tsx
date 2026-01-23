import { GdprPolicy } from "@/components/gdpr/gdpr-policy";
import { Container } from "@/components/ui/container";
import { Hero, HeroContent, HeroDescription, HeroTitle } from "@/components/ui/hero";
import type { Metadata } from "next";
import { legal } from "@/config/legal";
import { site } from "@/config/site";

const title = "Privacy Policy";
const description =
  "Information about the processing of personal data in accordance with the GDPR regulation";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/gdpr",
  },
  openGraph: {
    title: `${title} | ${site.name}`,
    description,
    url: `${site.url}/gdpr`,
  },
  twitter: {
    title: `${title} | ${site.name}`,
    description,
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function Page() {
  return (
    <>
      <Hero>
        <HeroContent size="md">
          <HeroTitle>{title}</HeroTitle>
          <HeroDescription>{description}</HeroDescription>
        </HeroContent>
      </Hero>

      <Container size="md" className="prose pb-24">
        <GdprPolicy
          company={{
            name: legal.legalName,
            address: legal.address,
            id: legal.id,
            domain: legal.domain,
          }}
          contact={{
            email: legal.contact.email,
            phone: legal.contact.phone,
          }}
          effectiveDate="1. January 2025"
          locale={site.locale === "cs" ? "cs" : "en"}
        />
      </Container>
    </>
  );
}
