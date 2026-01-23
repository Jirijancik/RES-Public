"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const floatingBarVariants = cva("top-0 isolate", {
  variants: {
    position: {
      sticky: "sticky",
      fixed: "fixed",
    },
  },
  defaultVariants: {
    position: "sticky",
  },
});

function FloatingBar({
  className,
  position,
  autoHide,
  scrolledThreshold = 64,
  autoHideThreshold = 512,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof floatingBarVariants> & {
    autoHide?: boolean;
    scrolledThreshold?: number;
    autoHideThreshold?: number;
    asChild?: boolean;
  }) {
  const [isHidden, setIsHidden] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const isSticky = position === "sticky";
  const isFixed = position === "fixed";

  // previous scroll position
  const prevScrollY = useRef(0);

  // Set mounted state to prevent hydration mismatch
  useEffect(() => {
    Promise.resolve().then(() => {
      setIsMounted(true);
    });
  }, []);

  useLayoutEffect(() => {
    if (!(isSticky || isFixed) || !isMounted) return;

    function handleScroll() {
      const currentScrollY = window.scrollY;

      // Handle scrolled state
      if (currentScrollY > scrolledThreshold) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      // Handle auto-hide behavior
      if (!autoHide) return;

      if (currentScrollY > autoHideThreshold && currentScrollY > prevScrollY.current) {
        setIsHidden(true);
      } else {
        setIsHidden(false);
      }

      // Update previous scroll position
      prevScrollY.current = currentScrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Only call handleScroll after component is mounted to prevent hydration mismatch
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [autoHide, isSticky, isFixed, autoHideThreshold, scrolledThreshold, isMounted]);

  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      {...props}
      data-scrolled={isMounted && isScrolled ? "true" : undefined}
      data-hidden={isMounted && isHidden ? "true" : undefined}
      className={cn(floatingBarVariants({ position, className }))}
    />
  );
}

export { FloatingBar, floatingBarVariants };
