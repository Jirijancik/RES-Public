import { Link } from "@/components/ui/link";
import { Logo } from "@/components/ui/logo";
import { ArrowUpIcon, ChevronDownIcon } from "lucide-react";
import { NavLink } from "@/components/layout/nav-link";
import { Container } from "@/components/ui/container";
import { ThemeSwitcher } from "./theme-switcher";
import { SocialMediaIcons } from "./social-media-icons";
import { type NavigationItem, type NavigationDropdown, navLinksArray } from "@/config/nav-links";
import { Separator } from "../ui/separator";
import { legalLinksArray } from "@/config/legal-links";
import { CookieSettingsTrigger } from "../cookies/cookie-settings-trigger";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";

import { chain, cn } from "@/lib/utils";
import { site } from "@/config/site";

// Type guard to check if an item is a dropdown
function isDropdown(item: NavigationItem): item is NavigationDropdown {
  return "items" in item;
}

function FooterNavigation({ items }: { items: NavigationItem[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, index) => {
        if (isDropdown(item)) {
          return (
            <li key={index}>
              <Collapsible className="space-y-2">
                <CollapsibleTrigger className="flex items-center justify-start gap-3 text-sm font-medium">
                  {item.name}
                  <ChevronDownIcon aria-hidden="true" className="size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent asChild>
                  <ul className="space-y-2 pl-2">
                    {item.items.map((subItem) => (
                      <li key={subItem.href}>
                        <NavLink
                          href={subItem.href}
                          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                        >
                          {subItem.name}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            </li>
          );
        } else {
          return (
            <li key={index}>
              <NavLink
                href={item.href}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                {item.name}
              </NavLink>
            </li>
          );
        }
      })}
    </ul>
  );
}

export function Footer(props: React.ComponentProps<"footer">) {
  return (
    <footer {...props} className={cn("border-t-border border-t", props.className)}>
      <Container>
        <div className="grid gap-x-32 gap-y-16 py-16 lg:grid-cols-3 xl:gap-x-52">
          {/* Brand section */}
          <div className="flex flex-col items-start justify-start gap-7">
            <Link href="/" aria-label="Home Page">
              <Logo aria-hidden="true" className="w-20" />
            </Link>
            <p className="text-sm">{site.defaultTitle}</p>
            <Separator />
            <ThemeSwitcher />
          </div>

          <div className="grid gap-y-16 sm:grid-cols-2 md:grid-cols-3 lg:col-span-2">
            <div className="flex flex-col items-start justify-start gap-7">
              <p className="text-sm font-semibold">Navigation</p>
              <FooterNavigation items={navLinksArray} />
            </div>

            <div className="flex flex-col items-start justify-start gap-7">
              <p className="text-sm font-semibold">Legal</p>
              <ul className="flex flex-col gap-2">
                {legalLinksArray.map((item, index) => (
                  <li key={index}>
                    <NavLink
                      href={item.href}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {item.name}
                    </NavLink>
                  </li>
                ))}
                <li>
                  <CookieSettingsTrigger className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                    Cookie settings
                  </CookieSettingsTrigger>
                </li>
              </ul>
            </div>

            <div className="flex flex-col items-start justify-start gap-6">
              <p className="text-sm font-semibold">Social media</p>
              <SocialMediaIcons />
            </div>
          </div>
        </div>

        {/* Metadata footer section */}
        <div className="border-t-border flex min-w-0 flex-col flex-wrap items-start justify-between gap-6 border-t py-10 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center">
            <Copyright company={site.name} />
          </div>
          <div className="flex flex-1 items-center sm:justify-center">
            <AgencyCredit />
          </div>
          <div className="flex flex-1 items-center sm:justify-end">
            <ScrollToTopButton className="mt-auto" />
          </div>
        </div>
      </Container>
    </footer>
  );
}

function Copyright({
  company = "Your Company",
  ...props
}: Omit<React.ComponentProps<"p">, "children"> & {
  company?: string;
}) {
  return (
    <p {...props} className={cn("text-text-subtle text-sm", props.className)}>
      Copyright &copy;&nbsp;{new Date().getFullYear()}&nbsp;{company}. All rights reserved.
    </p>
  );
}

function ScrollToTopButton(props: React.ComponentProps<"button">) {
  return (
    <button
      {...props}
      onClick={chain(props.onClick, () => window.scrollTo({ top: 0, behavior: "smooth" }))}
      className={cn(
        "cursor-pointer text-sm underline decoration-current/20 decoration-1 underline-offset-2 hover:decoration-current/60",
        props.className
      )}
    >
      Scroll to top <ArrowUpIcon aria-hidden="true" className="ml-1 inline size-[1em]" />
    </button>
  );
}

function AgencyCredit(props: React.ComponentProps<"p">) {
  return (
    <p {...props} className={cn("text-sm", props.className)}>
      <span>Created by </span>
      <NavLink
        href="https://www.gtdn.online/"
        className="underline decoration-current/20 decoration-1 underline-offset-2 hover:decoration-current/60"
        showExternalIcon
      >
        gtdn.online
      </NavLink>
    </p>
  );
}
