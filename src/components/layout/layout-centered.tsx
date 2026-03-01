"use client";

import { Link, type LinkProps } from "@/components/ui/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "../ui/button";
import { Header } from "./header";
import { Footer } from "./footer";
import { navLinksArray } from "@/config/nav-links";

// Main Layout Component
export function LayoutCentered({ children }: { children: React.ReactNode }) {
  const contentId = "gtdn-app-content";

  return (
    <div
      className={cn(
        "[--navbar-height:--spacing(16)]",
        "relative isolate flex min-h-dvh w-full pt-0 flex-col justify-between *:shrink-0 *:grow-0 *:data-[slot=main]:shrink *:data-[slot=main]:grow"
      )}
    >
      {/* Skip to content - A11y */}
      <SkipToContent href={`#${contentId}`}>Skip to content</SkipToContent>

      {/* Header */}
      <Header navigation={navLinksArray} />

      {/* Main content */}
      <main id={contentId} data-slot="main" className="min-w-0">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

function SkipToContent({ children, className, ...props }: LinkProps) {
  return (
    <Link
      {...props}
      className={cn(
        buttonVariants({ variant: "default" }),
        "fixed top-6 left-6 z-1000 hidden -translate-y-[1000%] focus-visible:translate-y-0 pointer-fine:block",
        className
      )}
    >
      {children}
    </Link>
  );
}
