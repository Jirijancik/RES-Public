"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { useCookieContext } from "./cookie-context";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Link } from "../ui/link";
import { legalLinks } from "@/config/legal-links";

export function CookieSettingsDialog() {
  const { consent, updateConsent, saveConsent, isSettingsOpen, closeSettingsDialog } =
    useCookieContext();

  function handleDeny() {
    saveConsent({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    });
    closeSettingsDialog();
  }

  function handleAcceptAll() {
    saveConsent({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    });
    closeSettingsDialog();
  }

  function handleSave() {
    saveConsent();
    closeSettingsDialog();
  }

  return (
    <AlertDialog open={isSettingsOpen} onOpenChange={closeSettingsDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cookie Consent Settings</AlertDialogTitle>
          <AlertDialogDescription>
            Manage your cookie preferences. Blocking some cookies may impact your experience.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div>
          <div className="border-border divide-border mt-4 divide-y rounded-lg border">
            <div className="flex flex-col gap-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="necessary" className="cursor-not-allowed opacity-70">
                  Necessary
                </Label>
                <Switch
                  id="necessary"
                  checked={consent.necessary}
                  disabled
                  aria-label="Necessary cookies (always enabled)"
                />
              </div>
              <p className="text-muted-foreground text-sm opacity-70">
                Essential for the website to function. Enable basic features like page navigation
                and secure areas.
              </p>
            </div>

            <div className="flex flex-col gap-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="functional" className="cursor-pointer">
                  Functional
                </Label>
                <Switch
                  id="functional"
                  checked={consent.functional}
                  onCheckedChange={(checked) => updateConsent("functional", checked as boolean)}
                  aria-label="Functional cookies"
                />
              </div>
              <p className="text-muted-foreground text-sm">
                Enable enhanced functionality and personalization, such as remembering your
                preferences and settings.
              </p>
            </div>

            <div className="flex flex-col gap-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="analytics" className="cursor-pointer">
                  Analytics
                </Label>
                <Switch
                  id="analytics"
                  checked={consent.analytics}
                  onCheckedChange={(checked) => updateConsent("analytics", checked as boolean)}
                  aria-label="Analytics cookies"
                />
              </div>
              <p className="text-muted-foreground text-sm">
                Help us understand how visitors interact with our website to improve content and
                user experience.
              </p>
            </div>

            <div className="flex flex-col gap-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="marketing" className="cursor-pointer">
                  Marketing
                </Label>
                <Switch
                  id="marketing"
                  checked={consent.marketing}
                  onCheckedChange={(checked) => updateConsent("marketing", checked as boolean)}
                  aria-label="Marketing cookies"
                />
              </div>
              <p className="text-muted-foreground text-sm">
                Used to deliver relevant advertisements and measure the effectiveness of advertising
                campaigns.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-muted-foreground text-sm">
              For more information about how we use cookies, please read our{" "}
              <Link
                href={legalLinks.cookies.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline"
              >
                cookies policy.
              </Link>
            </p>
          </div>
        </div>
        <AlertDialogFooter className="mt-4">
          <AlertDialogPrimitive.Action asChild>
            <Button variant="secondary" onClick={handleDeny}>
              Deny
            </Button>
          </AlertDialogPrimitive.Action>
          <AlertDialogPrimitive.Action asChild>
            <Button variant="secondary" onClick={handleAcceptAll}>
              Accept all
            </Button>
          </AlertDialogPrimitive.Action>
          <AlertDialogPrimitive.Action asChild>
            <Button onClick={handleSave}>Save</Button>
          </AlertDialogPrimitive.Action>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
