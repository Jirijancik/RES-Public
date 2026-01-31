"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Combobox } from "@/components/ui/combobox";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { DISTRICT_CODES } from "@/lib/ares";
import type { StringFieldApi } from "./types";

interface DistrictSelectProps {
  field: StringFieldApi;
  regionCode?: string;
  onDistrictChange?: (districtCode: string) => void;
}

export function DistrictSelect({
  field,
  regionCode,
  onDistrictChange,
}: DistrictSelectProps) {
  const { t } = useTranslation("forms");
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const options = useMemo(() => {
    const regionCodeNum = regionCode ? Number(regionCode) : null;
    const filtered = regionCodeNum
      ? DISTRICT_CODES.filter((district) => district.region === regionCodeNum)
      : DISTRICT_CODES;

    return filtered.map((district) => ({
      value: String(district.code),
      label: district.name,
    }));
  }, [regionCode]);

  const handleValueChange = (value: string) => {
    field.handleChange(value);
    onDistrictChange?.(value);
  };

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={`ares-${field.name}`}>
        {t("ares.labels.district")}
      </FieldLabel>
      <Combobox
        id={`ares-${field.name}`}
        options={options}
        value={field.state.value}
        onValueChange={handleValueChange}
        onBlur={field.handleBlur}
        placeholder={t("ares.placeholders.district")}
        searchPlaceholder={t("ares.placeholders.searchDistrict")}
        emptyMessage={t("ares.placeholders.noResults")}
        aria-invalid={isInvalid}
        clearable
      />
      {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
    </Field>
  );
}
