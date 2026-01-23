"use client";

import { Link, type LinkProps } from "../ui/link";
import { usePathname } from "next/navigation";
import { ArrowUpRightIcon } from "lucide-react";

export type NavLinkProps = LinkProps & {
  showExternalIcon?: boolean;
  matchNested?: boolean;
};

export function NavLink({
  children,
  href,
  target,
  rel,
  showExternalIcon = false,
  matchNested = false,
  ...props
}: NavLinkProps) {
  const pathname = usePathname();
  const isExternal = typeof href === "string" && href.startsWith("http");
  const hrefString = typeof href === "string" ? href : (href.pathname ?? "");
  const isCurrent = matchNested
    ? pathname === hrefString || pathname.startsWith(`${hrefString}/`)
    : pathname === hrefString;

  return (
    <Link
      {...props}
      href={href}
      aria-current={isCurrent ? "page" : undefined}
      data-current={isCurrent ? "true" : undefined}
      data-external={isExternal ? "true" : undefined}
      target={isExternal ? target || "_blank" : target}
      rel={isExternal ? rel || "noopener noreferrer" : rel}
    >
      {children}
      {isExternal && showExternalIcon && (
        <ArrowUpRightIcon aria-hidden="true" className="ml-1 inline size-[1em] opacity-50" />
      )}
    </Link>
  );
}
