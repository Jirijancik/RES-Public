"use client";

import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { SearchIcon, SlidersHorizontalIcon, ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { RegionSelect } from "@/components/home/region-select";
import type { CompanySearchParams } from "@/lib/company/company.types";

interface CompanySearchFormProps {
  onSearch: (params: CompanySearchParams) => void;
  isPending: boolean;
}

export function CompanySearchForm({ onSearch, isPending }: CompanySearchFormProps) {
  const { t } = useTranslation("forms");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const searchSchema = useMemo(
    () =>
      z.object({
        name: z.string(),
        ico: z
          .string()
          .refine((val) => !val || /^\d*$/.test(val), {
            message: t("ares.validation.ico.digits"),
          })
          .refine((val) => !val || val.length === 0 || val.length === 8, {
            message: t("ares.validation.ico.format"),
          }),
        region: z.string(),
        status: z.string(),
      }),
    [t]
  );

  type SearchFormValues = z.infer<typeof searchSchema>;

  const form = useForm({
    defaultValues: {
      name: "",
      ico: "",
      region: "",
      status: "active",
    },
    validators: {
      onSubmit: searchSchema,
    },
    onSubmit: ({ value }: { value: SearchFormValues }) => {
      const params: CompanySearchParams = {
        status: (value.status as "active" | "inactive" | "all") || "active",
        limit: 25,
        offset: 0,
      };

      if (value.ico && value.ico.length === 8) {
        params.ico = value.ico;
      }
      if (value.name && value.name.trim().length > 0) {
        params.name = value.name.trim();
      }

      if (value.region) {
        params.regionCode = Number(value.region);
      }

      onSearch(params);
    },
  });

  function handleClear() {
    form.reset();
    onSearch({ status: "active", limit: 25, offset: 0 });
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
          <form.Field name="name">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={`company-${field.name}`}>
                    {t("ares.labels.businessName")}
                  </FieldLabel>
                  <Input
                    id={`company-${field.name}`}
                    name={`company-${field.name}`}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder={t("company.search.placeholder")}
                  />
                  {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="ico">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={`company-${field.name}`}>
                    {t("ares.labels.ico")}
                  </FieldLabel>
                  <Input
                    id={`company-${field.name}`}
                    name={`company-${field.name}`}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder={t("ares.placeholders.ico")}
                    maxLength={8}
                  />
                  {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                </Field>
              );
            }}
          </form.Field>
        </div>

        {/* Advanced filters */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors">
            <SlidersHorizontalIcon className="size-4" />
            {t("company.search.filters.advanced")}
            <ChevronDownIcon className={`size-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-4 grid grid-cols-1 gap-4 @lg:grid-cols-2">
              <form.Field name="region">
                {(field) => <RegionSelect field={field} />}
              </form.Field>

              <form.Field name="status">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={`company-${field.name}`}>
                      {t("company.search.filters.status")}
                    </FieldLabel>
                    <select
                      id={`company-${field.name}`}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                      <option value="active">{t("company.search.filters.statusActive")}</option>
                      <option value="inactive">{t("company.search.filters.statusInactive")}</option>
                      <option value="all">{t("company.search.filters.statusAll")}</option>
                    </select>
                  </Field>
                )}
              </form.Field>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner /> : <SearchIcon aria-hidden="true" className="size-4" />}
            {isPending ? t("company.search.buttons.searching") : t("company.search.buttons.search")}
          </Button>
          <Button type="button" variant="outline" onClick={handleClear} disabled={isPending}>
            {t("company.search.buttons.clear")}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
