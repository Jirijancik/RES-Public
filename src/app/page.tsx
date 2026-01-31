import type { Metadata } from "next";
import { HomePage } from "@/components/home";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export default function Page() {
  return <HomePage />;
}
