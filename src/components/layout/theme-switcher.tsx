"use client";

import * as RadioGroup from "@radix-ui/react-radio-group";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ThemeSwitcherProps = {
  className?: string;
};

type ToggleButtonProps = {
  value: string;
  label: string;
  isCurrent: boolean;
  children: React.ReactNode;
};

function ToggleButton({ value, label, isCurrent, children }: ToggleButtonProps) {
  return (
    <RadioGroup.Item
      value={value}
      aria-label={label}
      data-current={isCurrent ? "true" : undefined}
      className="focus-visible:ring-ring data-current:text-foreground text-muted-foreground data-current:bg-muted relative flex size-8 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      {children}
    </RadioGroup.Item>
  );
}

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  function handleValueChange(value: string) {
    setTheme(value);
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
      value={theme}
      onValueChange={handleValueChange}
      className={cn(
        "bg-background ring-border relative isolate flex h-10 rounded-full p-1 ring-1",
        className
      )}
    >
      <ToggleButton value="light" label="Light theme" isCurrent={theme === "light"}>
        <SunIcon aria-hidden="true" className="size-4" />
      </ToggleButton>
      <ToggleButton value="system" label="System theme" isCurrent={theme === "system"}>
        <MonitorIcon aria-hidden="true" className="size-4" />
      </ToggleButton>
      <ToggleButton value="dark" label="Dark theme" isCurrent={theme === "dark"}>
        <MoonIcon aria-hidden="true" className="size-4" />
      </ToggleButton>
    </RadioGroup.Root>
  );
}
