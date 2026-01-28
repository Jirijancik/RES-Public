"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Combobox } from "@/components/ui/combobox";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { REGION_CODES } from "@/lib/ares";

interface RegionSelectProps {
  field: {
    name: string;
    state: {
      value: string;
      meta: {
        isTouched: boolean;
        isValid: boolean;
        errors: Array<{ message?: string } | undefined>;
      };
    };
    handleChange: (value: string) => void;
    handleBlur: () => void;
  };
  onRegionChange?: (regionCode: string) => void;
}

export function RegionSelect({ field, onRegionChange }: RegionSelectProps) {
  const { t } = useTranslation("forms");
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const options = useMemo(
    () =>
      REGION_CODES.map((region) => ({
        value: String(region.code),
        label: region.name,
      })),
    []
  );

  const handleValueChange = (value: string) => {
    field.handleChange(value);
    onRegionChange?.(value);
  };

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={`ares-${field.name}`}>
        {t("ares.labels.region")}
      </FieldLabel>
      <Combobox
        id={`ares-${field.name}`}
        options={options}
        value={field.state.value}
        onValueChange={handleValueChange}
        onBlur={field.handleBlur}
        placeholder={t("ares.placeholders.region")}
        searchPlaceholder={t("ares.placeholders.searchRegion")}
        emptyMessage={t("ares.placeholders.noResults")}
        aria-invalid={isInvalid}
        clearable
      />
      {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
    </Field>
  );
}
