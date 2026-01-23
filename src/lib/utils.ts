import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isBrowser = typeof document !== "undefined";

/** Combines multiple callbacks into a single function that calls each in sequence */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function chain(...callbacks: any[]): (...args: any[]) => void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (...args: any[]) => {
    // eslint-disable-next-line prefer-const
    for (let callback of callbacks) {
      if (typeof callback === "function") {
        callback(...args);
      }
    }
  };
}

/**
 * Formats current date and time for email timestamps
 * @returns Formatted datetime string (e.g., "2024-12-25 15:45")
 */
export function formatEmailTimestamp(): string {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

/** Creates a delay in milliseconds */
export function wait(duration: number) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

export function formatDate(
  date: Date | string,
  language: string = "cs-CZ",
  options?: Intl.DateTimeFormatOptions
): string {
  return new Date(date).toLocaleDateString(
    language,
    options || { year: "numeric", month: "short", day: "numeric" }
  );
}

export function getValidChildren(children: React.ReactNode) {
  return React.Children.toArray(children).filter(React.isValidElement);
}

/** Shuffles array items using Fisher-Yates algorithm */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
