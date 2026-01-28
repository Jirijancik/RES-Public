"use client";

import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { AresResultCard } from "./ares-result-card";
import type { AresSearchResult } from "@/lib/ares";
import type { AresApiError } from "@/lib/ares/ares.endpoints";

interface AresSearchResultsProps {
  results: AresSearchResult | undefined;
  isError: boolean;
  error: AresApiError | null;
}

export function AresSearchResults({ results, isError, error }: AresSearchResultsProps) {
  const { t } = useTranslation("forms");

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon aria-hidden="true" className="size-4" />
        <AlertTitle>{t("ares.results.error")}</AlertTitle>
        <AlertDescription>{error?.message}</AlertDescription>
      </Alert>
    );
  }

  if (!results) {
    return null;
  }

  if (results.totalCount === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">{t("ares.results.noResults")}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-muted-foreground text-sm">
        {t("ares.results.found", { count: results.totalCount })}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {results.economicSubjects.map((subject) => (
          <AresResultCard key={subject.icoId} subject={subject} />
        ))}
      </div>
    </div>
  );
}
