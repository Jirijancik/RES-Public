"use client";

import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useState, useRef } from "react";
import { Link } from "@/components/ui/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "../ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircleIcon, AlertCircleIcon } from "lucide-react";
import { legalLinks } from "@/config/legal-links";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { Turnstile, type TurnstileRef } from "@/components/turnstile/turnstile";

import { cn } from "@/lib/utils";

const newsletterFormSchema = z.object({
  "newsletter-email": z.email({
    message: "Please enter a valid email address.",
  }),
  turnstileToken: z.string().min(1, {
    message: "Please complete verification.",
  }),
});

type NewsletterFormValues = z.infer<typeof newsletterFormSchema>;

export function NewsletterForm({ className, ...props }: React.ComponentProps<"div">) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const turnstileRef = useRef<TurnstileRef>(null);

  const form = useForm({
    defaultValues: {
      "newsletter-email": "",
      turnstileToken: "",
    },
    validators: {
      onSubmit: newsletterFormSchema,
    },
    onSubmit: async ({ value }: { value: NewsletterFormValues }) => {
      setIsSubmitting(true);
      setSubmitStatus({ type: null, message: "" });

      try {
        const response = await fetch("/api/newsletter", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: value["newsletter-email"],
            turnstileToken: value.turnstileToken,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setSubmitStatus({
            type: "success",
            message: data.message || "Successfully subscribed to newsletter!",
          });
          form.reset();
          turnstileRef.current?.reset();
        } else {
          setSubmitStatus({
            type: "error",
            message: data.error || "An error occurred while subscribing to newsletter.",
          });
        }
      } catch {
        setSubmitStatus({
          type: "error",
          message: "An error occurred during subscription. Please try again later.",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  return (
    <div {...props} className={cn("@container w-full", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <FieldGroup>
          <div className="flex items-end gap-3">
            <form.Field name="newsletter-email">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid} className="w-full">
                    <FieldLabel htmlFor={field.name}>Email address *</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="your-email@example.com"
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            </form.Field>

            <Button type="submit" disabled={isSubmitting} className="hidden @sm:inline-flex">
              {isSubmitting && <Spinner />}
              {isSubmitting ? "Subscribing..." : "Subscribe"}
            </Button>
          </div>

          <p className="text-muted-foreground text-sm">
            By clicking Subscribe you agree to receive our newsletter. You can unsubscribe at any
            time. Learn more in our{" "}
            <Link
              href={legalLinks.gdpr.href}
              target="_blank"
              className="underline hover:no-underline"
            >
              privacy policy.
            </Link>{" "}
          </p>

          <form.Field name="turnstileToken">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <Turnstile
                    ref={turnstileRef}
                    onSuccess={(token: string) => field.handleChange(token)}
                    onError={() => field.handleChange("")}
                    onExpire={() => field.handleChange("")}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>

          <Button type="submit" disabled={isSubmitting} className="w-full @sm:hidden">
            {isSubmitting && <Spinner />}
            {isSubmitting ? "Subscribing..." : "Subscribe"}
          </Button>

          {submitStatus.type && (
            <Alert variant={submitStatus.type === "error" ? "destructive" : "default"}>
              {submitStatus.type === "success" ? (
                <CheckCircleIcon aria-hidden="true" className="size-4" />
              ) : (
                <AlertCircleIcon aria-hidden="true" className="size-4" />
              )}
              <AlertTitle>
                {submitStatus.type === "success"
                  ? "Successfully subscribed!"
                  : "Subscription failed"}
              </AlertTitle>
              <AlertDescription>{submitStatus.message}</AlertDescription>
            </Alert>
          )}
        </FieldGroup>
      </form>
    </div>
  );
}
