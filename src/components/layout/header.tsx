import clsx from "clsx";
import {
  MobileMenu,
  MobileMenuClose,
  MobileMenuContent,
  MobileMenuFooter,
  MobileMenuHeader,
  MobileMenuNested,
  MobileMenuTitle,
  MobileMenuTrigger,
} from "./mobile-menu";
import { FloatingBar } from "@/components/layout/floating-bar";
import { Link } from "@/components/ui//link";
import { Container } from "@/components/ui/container";
import { MenuIcon, ChevronDownIcon, ChevronRightIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { NavLink } from "@/components/layout/nav-link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NavigationItem, NavigationDropdown } from "@/config/nav-links";
import { SocialMediaIcons } from "./social-media-icons";
import { contact } from "@/config/contact";
import { CopyButton } from "../ui/copy-button";
import { cn } from "@/lib/utils";

// Type guard to check if an item is a dropdown
function isDropdown(item: NavigationItem): item is NavigationDropdown {
  return "items" in item;
}

// Navigation component that renders nav items
function Navigation({ items }: { items: NavigationItem[] }) {
  return (
    <ul className="flex items-center gap-6">
      {items.map((item, index) => {
        if (isDropdown(item)) {
          return (
            <DropdownMenu key={index}>
              <DropdownMenuTrigger asChild>
                <li>
                  <button className="text-muted-foreground hover:text-foreground data-[state=open]:text-foreground flex items-center gap-2 text-sm font-medium whitespace-nowrap transition-colors">
                    {item.name}
                    <ChevronDownIcon className="size-4" />
                  </button>
                </li>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {item.items.map((subItem) => (
                  <DropdownMenuItem key={subItem.href} asChild>
                    <NavLink
                      href={subItem.href}
                      className="w-full cursor-pointer whitespace-nowrap"
                    >
                      {subItem.name}
                    </NavLink>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        } else {
          return (
            <li key={index}>
              <NavLink
                href={item.href}
                className="text-muted-foreground hover:text-foreground data-current:text-foreground inline-flex items-center justify-center rounded-md text-sm font-medium whitespace-nowrap underline-offset-2 transition-colors data-current:underline"
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

// Mobile navigation component for the drawer
function MobileNavigation({ items }: { items: NavigationItem[] }) {
  return (
    <ul className="divide-border flex flex-col divide-y">
      {items.map((item, index) => {
        if (isDropdown(item)) {
          return (
            <li key={index}>
              <MobileMenuNested>
                <MobileMenuTrigger asChild>
                  <button className="text-foreground flex w-full items-center justify-between gap-3 py-3">
                    {item.name}
                    <ChevronRightIcon aria-hidden="true" className="size-[1em]" />
                  </button>
                </MobileMenuTrigger>
                <MobileMenuContent>
                  <div className="mx-auto w-full max-w-xl">
                    <MobileMenuHeader>
                      <MobileMenuTitle>{item.name}</MobileMenuTitle>
                    </MobileMenuHeader>
                    <ul className="divide-border flex flex-col divide-y">
                      {item.items.map((subItem, index) => (
                        <li key={index}>
                          <MobileMenuClose asChild>
                            <NavLink
                              key={subItem.href}
                              href={subItem.href}
                              className="text-foreground block w-full py-3"
                            >
                              {subItem.name}
                            </NavLink>
                          </MobileMenuClose>
                        </li>
                      ))}
                    </ul>
                  </div>
                </MobileMenuContent>
              </MobileMenuNested>
            </li>
          );
        } else {
          return (
            <li key={index}>
              <MobileMenuClose asChild>
                <NavLink
                  key={item.href}
                  href={item.href}
                  className="text-foreground block w-full py-3"
                >
                  {item.name}
                </NavLink>
              </MobileMenuClose>
            </li>
          );
        }
      })}
    </ul>
  );
}

export function Header({ navigation }: { navigation: NavigationItem[] }) {
  return (
    <FloatingBar
      asChild
      position={"sticky"}
      autoHide={true}
      className={clsx(
        // Base styles for the navbar
        "z-100 h-(--navbar-height,64px) w-full",
        // Transition and initial state
        "transform-gpu transition duration-300",
        // Initial state
        "bg-background/75 border-b border-transparent backdrop-blur-2xl",
        // Scrolled state - when the user starts scrolling
        "data-scrolled:border-border",
        // Hidden state for auto-hide behavior
        "data-hidden:data-scrolled:shadow-none data-hidden:motion-safe:-translate-y-full"
      )}
    >
      <header>
        <Container className="flex h-full items-center justify-between gap-8">
          {/* Left side */}
          <div className="flex flex-1 items-center gap-4">
            <Link href="/" aria-label="Home Page">
              <Logo aria-hidden="true" className="w-20" />
            </Link>
          </div>

          {/* Center */}
          <div className="flex flex-1 items-center justify-center gap-4">
            <nav className="hidden lg:block">
              <Navigation items={navigation} />
            </nav>
          </div>

          {/* Right side */}
          <div className="flex flex-1 items-center justify-end gap-4">
            {/* Call to action */}
            <ul className="ml-auto hidden gap-4 lg:flex">
              <li>
                <Button asChild variant="secondary">
                  <CopyButton toCopy={contact.email} className="relative">
                    {({ isCopied }) => (
                      <>
                        <span className={cn(!isCopied ? "visible" : "invisible")}>
                          {contact.email}
                        </span>
                        <span
                          className={cn(
                            "absolute inset-0 flex items-center justify-center",
                            isCopied ? "visible" : "invisible"
                          )}
                        >
                          <CheckIcon aria-hidden="true" className="mr-1 size-[1em]" />
                          Copied!
                        </span>
                      </>
                    )}
                  </CopyButton>
                </Button>
              </li>
            </ul>

            {/* Mobile menu */}
            <div className="lg:hidden">
              <MobileMenu>
                <MobileMenuTrigger asChild>
                  <Button variant="secondary" size="icon" aria-label="open menu">
                    <MenuIcon aria-hidden="true" />
                  </Button>
                </MobileMenuTrigger>
                <MobileMenuContent>
                  <MobileMenuHeader>
                    <MobileMenuTitle>Menu</MobileMenuTitle>
                  </MobileMenuHeader>
                  <div className="space-y-6">
                    <MobileNavigation items={navigation} />
                    <SocialMediaIcons />
                    <MobileMenuFooter>
                      <MobileMenuClose asChild>
                        <Button variant="secondary" size="lg" className="w-full">
                          Close menu
                        </Button>
                      </MobileMenuClose>
                    </MobileMenuFooter>
                  </div>
                </MobileMenuContent>
              </MobileMenu>
            </div>
          </div>
        </Container>
      </header>
    </FloatingBar>
  );
}
