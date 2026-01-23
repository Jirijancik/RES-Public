import { ContactForm } from "@/components/contact/contact-form";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Hero, HeroActions, HeroContent, HeroDescription, HeroTitle } from "@/components/ui/hero";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Metadata } from "next";
import { contact, formatPhoneNumber } from "@/config/contact";
import { site } from "@/config/site";

const title = "Contact";
const description = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: `${title} | ${site.name}`,
    description,
    url: `${site.url}/contact`,
  },
  twitter: {
    title: `${title} | ${site.name}`,
    description,
  },
};

export default function Page() {
  return (
    <div>
      <Hero>
        <HeroContent size="md">
          <HeroTitle>{title}</HeroTitle>
          <HeroDescription>{description}</HeroDescription>
          <HeroActions>
            <Button size="lg" asChild>
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <a href={`tel:${contact.phone}`}>{formatPhoneNumber(contact.phone)}</a>
            </Button>
          </HeroActions>
        </HeroContent>
      </Hero>

      <Container size="md" className="pb-24">
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-bold">Contact form</h2>
          </CardHeader>
          <CardContent>
            <ContactForm />
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
