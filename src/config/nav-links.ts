import { legalLinksArray } from "./legal-links";
import type { Route } from "next";

export type NavigationLink<T extends string = string> = {
  name: string;
  href: Route<T>;
};

export type NavigationDropdown = {
  name: string;
  items: NavigationLink[];
};

export type NavigationItem = NavigationLink | NavigationDropdown;

export const navLinks = {
  home: {
    name: "Home",
    href: "/",
  },
  legalLinks: {
    name: "Legal links",
    items: [...legalLinksArray],
  },
  contact: {
    name: "Contact",
    href: "/contact",
  },
} as const satisfies Record<string, NavigationItem>;

export const navLinksArray: NavigationItem[] = Object.values(navLinks);
