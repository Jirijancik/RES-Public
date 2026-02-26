"use client";

import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { JusticeResultCard } from "./justice-result-card";
import type { JusticeSearchResult } from "@/lib/justice";
import type { JusticeApiError } from "@/lib/justice/justice.endpoints";

interface JusticeSearchResultsProps {
  results: JusticeSearchResult | undefined;
  isError: boolean;
  error: JusticeApiError | null;
}

export function JusticeSearchResults({ results, isError, error }: JusticeSearchResultsProps) {
  const { t } = useTranslation("forms");

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon aria-hidden="true" className="size-4" />
        <AlertTitle>{t("justice.results.error")}</AlertTitle>
        <AlertDescription>{error?.message}</AlertDescription>
      </Alert>
    );
  }

  if (!results) {
    return null;
  }

  if (results.totalCount === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">{t("justice.results.noResults")}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-muted-foreground text-sm">
        {t("justice.results.found", { count: results.totalCount })}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {results.entities.map((entity) => (
          <JusticeResultCard key={entity.ico} entity={entity} />
        ))}
      </div>
    </div>
  );
}
