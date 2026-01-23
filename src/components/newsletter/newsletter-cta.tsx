import { NewsletterForm } from "./newsletter-form";
import { Card, CardContent } from "../ui/card";

export function NewsletterCta(props: React.ComponentProps<typeof Card>) {
  return (
    <Card {...props}>
      <CardContent className="grid gap-7 md:grid-cols-2">
        <div className="flex flex-col items-start justify-center gap-6">
          <h2 className="text-2xl font-bold sm:text-3xl">Subscribe to our newsletter</h2>
          <p className="text-muted-foreground">
            Stay up to date with the latest news, insights, and updates. Join our community of
            subscribers and never miss important announcements.
          </p>
        </div>
        <div className="relative z-10">
          <NewsletterForm />
        </div>
      </CardContent>
    </Card>
  );
}
