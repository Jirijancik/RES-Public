"use client";

import * as RadioGroup from "@radix-ui/react-radio-group";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

export type LanguageSwitcherProps = {
  className?: string;
};

type LanguageButtonProps = {
  value: string;
  label: string;
  isCurrent: boolean;
};

function LanguageButton({ value, label, isCurrent }: LanguageButtonProps) {
  return (
    <RadioGroup.Item
      value={value}
      aria-label={label}
      data-current={isCurrent ? "true" : undefined}
      className="focus-visible:ring-ring data-current:text-foreground text-muted-foreground data-current:bg-muted relative flex h-8 items-center justify-center rounded-full px-3 text-xs font-medium uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      {value}
    </RadioGroup.Item>
  );
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  function handleValueChange(value: string) {
    i18n.changeLanguage(value);
  }

  useEffect(() => {
    // Defer state update to avoid synchronous setState in effect
    Promise.resolve().then(() => {
      setMounted(true);
    });
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <RadioGroup.Root
      value={i18n.language}
      onValueChange={handleValueChange}
      aria-label={t("language.switchTo")}
      className={cn(
        "bg-background ring-border relative isolate flex h-10 rounded-full p-1 ring-1",
        className
      )}
    >
      <LanguageButton
        value="cs"
        label={t("language.cs")}
        isCurrent={i18n.language === "cs"}
      />
      <LanguageButton
        value="en"
        label={t("language.en")}
        isCurrent={i18n.language === "en"}
      />
    </RadioGroup.Root>
  );
}
