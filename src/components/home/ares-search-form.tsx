"use client";

import { useMemo } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { SearchIcon } from "lucide-react";
import { DISTRICT_CODES, type AresSearchParams } from "@/lib/ares";
import { RegionSelect } from "./region-select";
import { DistrictSelect } from "./district-select";

interface AresSearchFormProps {
  onSearch: (params: AresSearchParams) => void;
  isPending: boolean;
  onReset?: () => void;
}

export function AresSearchForm({ onSearch, isPending, onReset }: AresSearchFormProps) {
  const { t } = useTranslation("forms");

  const aresSearchFormSchema = useMemo(
    () =>
      z
        .object({
          ico: z
            .string()
            .refine((val) => !val || /^\d*$/.test(val), {
              message: t("ares.validation.ico.digits"),
            })
            .refine((val) => !val || val.length === 0 || val.length === 8, {
              message: t("ares.validation.ico.format"),
            }),
          businessName: z.string(),
          region: z.string(),
          district: z.string(),
        })
        .refine(
          (data) => {
            const hasIco = data.ico && data.ico.length === 8;
            const hasBusinessName = data.businessName && data.businessName.trim().length > 0;
            return hasIco || hasBusinessName;
          },
          {
            message: t("ares.validation.atLeastOne"),
            path: ["ico"],
          }
        ),
    [t]
  );

  type AresSearchFormValues = z.infer<typeof aresSearchFormSchema>;

  const form = useForm({
    defaultValues: {
      ico: "",
      businessName: "",
      region: "",
      district: "",
    },
    validators: {
      onSubmit: aresSearchFormSchema,
    },
    onSubmit: ({ value }: { value: AresSearchFormValues }) => {
      const params: AresSearchParams = {};

      if (value.ico && value.ico.length === 8) {
        params.ico = [value.ico];
      }

      if (value.businessName && value.businessName.trim().length > 0) {
        params.businessName = value.businessName.trim();
      }

      // Build location params if region or district is selected
      if (value.region || value.district) {
        const location: AresSearchParams["location"] = {};

        if (value.region) {
          location.regionCode = Number(value.region);
        }

        if (value.district) {
          location.districtCode = Number(value.district);
        }

        params.location = location;
      }

      onSearch(params);
    },
  });

  function handleClear() {
    form.reset();
    onReset?.();
  }

  // When region changes, clear district if it doesn't belong to the new region
  const handleRegionChange = (regionCode: string) => {
    const currentDistrict = form.getFieldValue("district");
    if (currentDistrict) {
      const districtData = DISTRICT_CODES.find((d) => String(d.code) === currentDistrict);
      // Clear district if it doesn't belong to the new region
      if (!regionCode || (districtData && String(districtData.region) !== regionCode)) {
        form.setFieldValue("district", "");
      }
    }
  };

  // When district changes, set the region to match the district's region
  const handleDistrictChange = (districtCode: string) => {
    if (districtCode) {
      const districtData = DISTRICT_CODES.find((d) => String(d.code) === districtCode);
      if (districtData) {
        form.setFieldValue("region", String(districtData.region));
      }
    }
  };

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
                  <FieldLabel htmlFor={`ares-${field.name}`}>{t("ares.labels.ico")}</FieldLabel>
                  <Input
                    id={`ares-${field.name}`}
                    name={`ares-${field.name}`}
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

          <form.Field name="businessName">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={`ares-${field.name}`}>
                    {t("ares.labels.businessName")}
                  </FieldLabel>
                  <Input
                    id={`ares-${field.name}`}
                    name={`ares-${field.name}`}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder={t("ares.placeholders.businessName")}
                  />
                  {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="region">
            {(field) => <RegionSelect field={field} onRegionChange={handleRegionChange} />}
          </form.Field>

          <form.Field name="district">
            {(field) => (
              <form.Subscribe selector={(state) => state.values.region}>
                {(regionValue) => (
                  <DistrictSelect
                    field={field}
                    regionCode={regionValue}
                    onDistrictChange={handleDistrictChange}
                  />
                )}
              </form.Subscribe>
            )}
          </form.Field>
        </div>

        <div className="flex gap-3">
          <form.Subscribe selector={(state) => [state.values.ico, state.values.businessName]}>
            {([icoValue, businessNameValue]) => {
              const hasValidIco = icoValue.length === 8;
              const hasBusinessName = businessNameValue.trim().length > 0;
              const isDisabled = isPending || (!hasValidIco && !hasBusinessName);

              return (
                <Button type="submit" disabled={isDisabled}>
                  {isPending ? <Spinner /> : <SearchIcon aria-hidden="true" className="size-4" />}
                  {isPending ? t("ares.buttons.searching") : t("ares.buttons.search")}
                </Button>
              );
            }}
          </form.Subscribe>
          <Button type="button" variant="outline" onClick={handleClear} disabled={isPending}>
            {t("ares.buttons.clear")}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
