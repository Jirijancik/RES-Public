"use client";

import { useCookieContext } from "./cookie-context";
import { chain } from "@/lib/utils";

export function CookieSettingsTrigger({ onClick, ...props }: React.ComponentProps<"button">) {
  const { openSettingsDialog } = useCookieContext();

  return <button {...props} onClick={chain(openSettingsDialog, onClick)} />;
}
