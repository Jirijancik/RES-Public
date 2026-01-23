import { socialMediaLinksArray } from "@/config/social-media-links";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

export function SocialMediaIcons(props: React.ComponentProps<"ul">) {
  return (
    <ul
      {...props}
      className={cn("flex flex-wrap items-center justify-between gap-2", props.className)}
    >
      {socialMediaLinksArray.map((item, index) => (
        <li key={index}>
          <Button size="icon" variant="ghost" asChild>
            <a href={item.href} target="_blank" rel="noopener noreferrer">
              <span className="sr-only">{item.name}</span>
              <item.icon aria-hidden="true" />
            </a>
          </Button>
        </li>
      ))}
    </ul>
  );
}
