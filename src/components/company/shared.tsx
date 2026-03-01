"use client";

import type { Route } from "next";
import { CheckIcon, CopyIcon, ArrowLeftIcon } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import type { JusticeAddress } from "@/lib/justice";

/** Displays a monospace value with an inline copy button */
export function CopyableValue({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono">{value}</span>
      <CopyButton
        toCopy={value}
        className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center transition-colors"
      >
        {({ isCopied }) =>
          isCopied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />
        }
      </CopyButton>
    </span>
  );
}

/** Definition list row with label + content (dt/dd pattern) */
export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

/** Inline active/terminated badge */
export function StatusBadge({ isActive, activeLabel, inactiveLabel }: {
  isActive: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive
          ? "bg-green-500/10 text-green-700 dark:text-green-400"
          : "bg-destructive/10 text-destructive"
      }`}
    >
      {isActive ? activeLabel : inactiveLabel}
    </span>
  );
}

/** Format a date string to Czech locale */
export function formatCzechDate(date: string | null | undefined): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("cs-CZ").format(parsed);
}

/** Format a Date object to Czech locale (for ARES dates) */
export function formatDate(date?: Date): string | null {
  if (!date) return null;
  const parsed = date instanceof Date ? date : new Date(date);
  if (isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("cs-CZ").format(parsed);
}

/** Build a one-line address from Justice address fields */
export function formatJusticeAddress(addr: JusticeAddress): string {
  if (addr.fullAddress) return addr.fullAddress;
  const street = addr.street || "";
  const house = [addr.houseNumber, addr.orientationNumber].filter(Boolean).join("/");
  const streetLine = street && house ? `${street} ${house}` : street || house;
  const city = [addr.municipality, addr.cityPart].filter(Boolean).join(" - ");
  return [streetLine, city, addr.postalCode].filter(Boolean).join(", ");
}

/** Back navigation link — parameterized href */
export function BackLink({ label, href = "/" }: { label: string; href?: string }) {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href={href as Route}>
        <ArrowLeftIcon aria-hidden="true" />
        {label}
      </Link>
    </Button>
  );
}
