import NextLink from "next/link";
import type { Route } from "next";

type NextLinkProps = React.ComponentProps<typeof NextLink>;

export type LinkProps<T extends string = string> = Omit<NextLinkProps, "href"> & {
  href: Route<T> | URL;
};

export function Link<T extends string = string>(props: LinkProps<T>) {
  return <NextLink {...props} />;
}
