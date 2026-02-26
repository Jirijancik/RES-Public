"use client";

import { useMemo } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Combobox } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchIcon } from "lucide-react";
import {
  JUSTICE_LEGAL_FORMS,
  JUSTICE_COURT_LOCATIONS,
  type JusticeSearchParams,
} from "@/lib/justice";

interface JusticeSearchFormProps {
  onSearch: (params: JusticeSearchParams) => void;
  isPending: boolean;
  onReset?: () => void;
}

export function JusticeSearchForm({ onSearch, isPending, onReset }: JusticeSearchFormProps) {
  const { t } = useTranslation("forms");

  const legalFormOptions = useMemo(
    () => JUSTICE_LEGAL_FORMS.map((lf) => ({ value: lf.code, label: lf.name })),
    []
  );

  const courtOptions = useMemo(
    () => JUSTICE_COURT_LOCATIONS.map((c) => ({ value: c.code, label: c.name })),
    []
  );

  const justiceSearchSchema = useMemo(
    () =>
      z
        .object({
          ico: z
            .string()
            .refine((val) => !val || /^\d*$/.test(val), {
              message: t("justice.validation.ico.digits"),
            })
            .refine((val) => !val || val.length === 0 || val.length === 8, {
              message: t("justice.validation.ico.format"),
            }),
          name: z.string(),
          legalForm: z.string(),
          court: z.string(),
          status: z.string(),
        })
        .refine(
          (data) => {
            const hasIco = data.ico && data.ico.length === 8;
            const hasName = data.name && data.name.trim().length > 0;
            return hasIco || hasName;
          },
          {
            message: t("justice.validation.atLeastOne"),
            path: ["ico"],
          }
        ),
    [t]
  );

  type JusticeSearchFormValues = z.infer<typeof justiceSearchSchema>;

  const form = useForm({
    defaultValues: {
      ico: "",
      name: "",
      legalForm: "",
      court: "",
      status: "active",
    },
    validators: {
      onSubmit: justiceSearchSchema,
    },
    onSubmit: ({ value }: { value: JusticeSearchFormValues }) => {
      const params: JusticeSearchParams = {};

      if (value.ico && value.ico.length === 8) {
        params.ico = value.ico;
      }

      if (value.name && value.name.trim().length > 0) {
        params.name = value.name.trim();
      }

      if (value.legalForm) {
        params.legalForm = value.legalForm;
      }

      if (value.court) {
        params.location = value.court;
      }

      if (value.status) {
        params.status = value.status;
      }

      onSearch(params);
    },
  });

  function handleClear() {
    form.reset();
    onReset?.();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="@container"
    >
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2">
          <form.Field name="ico">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={`justice-${field.name}`}>
                    {t("justice.labels.ico")}
                  </FieldLabel>
                  <Input
                    id={`justice-${field.name}`}
                    name={`justice-${field.name}`}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder={t("justice.placeholders.ico")}
                    maxLength={8}
                  />
                  {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="name">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={`justice-${field.name}`}>
                    {t("justice.labels.name")}
                  </FieldLabel>
                  <Input
                    id={`justice-${field.name}`}
                    name={`justice-${field.name}`}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder={t("justice.placeholders.name")}
                  />
                  {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="legalForm">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={`justice-${field.name}`}>
                  {t("justice.labels.legalForm")}
                </FieldLabel>
                <Combobox
                  id={`justice-${field.name}`}
                  options={legalFormOptions}
                  value={field.state.value}
                  onValueChange={(val) => field.handleChange(val)}
                  onBlur={field.handleBlur}
                  placeholder={t("justice.placeholders.legalForm")}
                  searchPlaceholder={t("justice.placeholders.searchLegalForm")}
                  emptyMessage={t("justice.placeholders.noResults")}
                  clearable
                />
              </Field>
            )}
          </form.Field>

          <form.Field name="court">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={`justice-${field.name}`}>
                  {t("justice.labels.court")}
                </FieldLabel>
                <Combobox
                  id={`justice-${field.name}`}
                  options={courtOptions}
                  value={field.state.value}
                  onValueChange={(val) => field.handleChange(val)}
                  onBlur={field.handleBlur}
                  placeholder={t("justice.placeholders.court")}
                  searchPlaceholder={t("justice.placeholders.searchCourt")}
                  emptyMessage={t("justice.placeholders.noResults")}
                  clearable
                />
              </Field>
            )}
          </form.Field>

          <form.Field name="status">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={`justice-${field.name}`}>
                  {t("justice.labels.status")}
                </FieldLabel>
                <Select value={field.state.value} onValueChange={(val) => field.handleChange(val)}>
                  <SelectTrigger id={`justice-${field.name}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t("justice.status.active")}</SelectItem>
                    <SelectItem value="deleted">{t("justice.status.deleted")}</SelectItem>
                    <SelectItem value="all">{t("justice.status.all")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </form.Field>
        </div>

        <div className="flex gap-3">
          <form.Subscribe selector={(state) => [state.values.ico, state.values.name]}>
            {([icoValue, nameValue]) => {
              const hasValidIco = icoValue.length === 8;
              const hasName = nameValue.trim().length > 0;
              const isDisabled = isPending || (!hasValidIco && !hasName);

              return (
                <Button type="submit" disabled={isDisabled}>
                  {isPending ? <Spinner /> : <SearchIcon aria-hidden="true" className="size-4" />}
                  {isPending ? t("justice.buttons.searching") : t("justice.buttons.search")}
                </Button>
              );
            }}
          </form.Subscribe>
          <Button type="button" variant="outline" onClick={handleClear} disabled={isPending}>
            {t("justice.buttons.clear")}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
