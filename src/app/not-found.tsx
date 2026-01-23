import { Button } from "@/components/ui/button";
import { Hero, HeroContent, HeroTitle, HeroDescription, HeroActions } from "@/components/ui/hero";
import { HomeIcon } from "lucide-react";
import { Link } from "@/components/ui/link";
import type { Metadata } from "next";
import { site } from "@/config/site";

const title = "Page Not Found";
const description =
  "Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or you entered the wrong URL.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title: `${title} | ${site.name}`,
    description,
    url: site.url,
  },
  twitter: {
    title: `${title} | ${site.name}`,
    description,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <Hero>
      <HeroContent className="text-center">
        <div className="text-primary font-medium">404</div>
        <HeroTitle>{title}</HeroTitle>
        <HeroDescription>{description}</HeroDescription>
        <HeroActions>
          <Button asChild size="lg">
            <Link href="/">
              <HomeIcon aria-hidden="true" />
              Go to Home page
            </Link>
          </Button>
        </HeroActions>
      </HeroContent>
    </Hero>
  );
}
