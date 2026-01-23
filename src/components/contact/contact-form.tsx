"use client";

import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useState, useRef } from "react";
import { Link } from "@/components/ui/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircleIcon, AlertCircleIcon } from "lucide-react";
import { legalLinks } from "@/config/legal-links";
import { Field, FieldLabel, FieldDescription, FieldError, FieldGroup } from "@/components/ui/field";
import { Turnstile, type TurnstileRef } from "@/components/turnstile/turnstile";
import { Spinner } from "../ui/spinner";

import { cn } from "@/lib/utils";

const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters.",
    })
    .max(50, {
      message: "Name must not be longer than 50 characters.",
    }),
  surname: z
    .string()
    .min(2, {
      message: "Surname must be at least 2 characters.",
    })
    .max(50, {
      message: "Surname must not be longer than 50 characters.",
    }),
  email: z.email({
    message: "Please enter a valid email address.",
  }),
  phone: z
    .string()
    .min(9, {
      message: "Phone number must be at least 9 characters.",
    })
    .regex(/^[+]?[0-9\s\-()]+$/, {
      message: "Please enter a valid phone number.",
    }),
  message: z
    .string()
    .min(10, {
      message: "Message must be at least 10 characters.",
    })
    .max(1000, {
      message: "Message must not be longer than 1000 characters.",
    }),
  gdprConsent: z.boolean().refine((value) => value === true, {
    message: "You must agree to the processing of personal data.",
  }),
  turnstileToken: z.string().min(1, {
    message: "Please complete the verification.",
  }),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export function ContactForm({ className, ...props }: React.ComponentProps<"div">) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const turnstileRef = useRef<TurnstileRef>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      surname: "",
      email: "",
      phone: "",
      message: "",
      gdprConsent: false,
      turnstileToken: "",
    },
    validators: {
      onSubmit: contactFormSchema,
    },
    onSubmit: async ({ value }: { value: ContactFormValues }) => {
      setIsSubmitting(true);
      setSubmitStatus({ type: null, message: "" });

      try {
        const response = await fetch("/api/contact-form", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(value),
        });

        const data = await response.json();

        if (response.ok) {
          setSubmitStatus({
            type: "success",
            message: data.message || "Message sent successfully!",
          });
          form.reset();
          turnstileRef.current?.reset();
        } else {
          setSubmitStatus({
            type: "error",
            message: data.error || "An error occurred while sending the message.",
          });
        }
      } catch {
        setSubmitStatus({
          type: "error",
          message: "An error occurred while sending the message. Please try again later.",
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
          <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2">
            <form.Field name="name">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={`contact-${field.name}`}>Name *</FieldLabel>
                    <Input
                      id={`contact-${field.name}`}
                      name={`contact-${field.name}`}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="Your name"
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="surname">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={`contact-${field.name}`}>Surname *</FieldLabel>
                    <Input
                      id={`contact-${field.name}`}
                      name={`contact-${field.name}`}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="Your surname"
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            </form.Field>
          </div>

          <form.Field name="email">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={`contact-${field.name}`}>Email Address *</FieldLabel>
                  <Input
                    id={`contact-${field.name}`}
                    name={`contact-${field.name}`}
                    type="email"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="your@email.com"
                  />
                  <FieldDescription>We will send our response to this address.</FieldDescription>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="phone">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={`contact-${field.name}`}>Phone Number *</FieldLabel>
                  <Input
                    id={`contact-${field.name}`}
                    name={`contact-${field.name}`}
                    type="tel"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="+420 123 456 789"
                  />
                  <FieldDescription>
                    Phone number for potential clarification of your inquiry.
                  </FieldDescription>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="message">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={`contact-${field.name}`}>Message *</FieldLabel>
                  <Textarea
                    id={`contact-${field.name}`}
                    name={`contact-${field.name}`}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="Write your message or inquiry..."
                    rows={4}
                  />
                  <FieldDescription>Describe how we can help you.</FieldDescription>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="gdprConsent">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field orientation="horizontal" data-invalid={isInvalid}>
                  <Checkbox
                    id={`contact-${field.name}`}
                    name={`contact-${field.name}`}
                    checked={field.state.value}
                    onCheckedChange={(checked) => field.handleChange(checked === true)}
                    aria-invalid={isInvalid}
                  />
                  <div className="space-y-1 leading-none">
                    <FieldLabel htmlFor={`contact-${field.name}`}>
                      <span>
                        I agree to the{" "}
                        <Link href={legalLinks.gdpr.href} className="underline hover:no-underline">
                          processing of personal data
                        </Link>{" "}
                        *
                      </span>
                    </FieldLabel>
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </div>
                </Field>
              );
            }}
          </form.Field>

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

          <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
            {isSubmitting && <Spinner />}
            {isSubmitting ? "Sending..." : "Submit"}
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
                  ? "Form submitted successfully!"
                  : "Submission failed"}
              </AlertTitle>
              <AlertDescription>{submitStatus.message}</AlertDescription>
            </Alert>
          )}
        </FieldGroup>
      </form>
    </div>
  );
}
