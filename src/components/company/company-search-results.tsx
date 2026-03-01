"use client";

import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyResultCard } from "./company-result-card";
import type { CompanySearchResult } from "@/lib/company/company.types";

interface CompanySearchResultsProps {
  results: CompanySearchResult | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  offset: number;
  limit: number;
  onPageChange: (newOffset: number) => void;
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border p-6 space-y-4">
      <Skeleton className="h-6 w-3/4" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}

export function CompanySearchResults({
  results,
  isLoading,
  isError,
  error,
  offset,
  limit,
  onPageChange,
}: CompanySearchResultsProps) {
  const { t } = useTranslation("forms");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-40" />
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon aria-hidden="true" className="size-4" />
        <AlertTitle>{t("company.search.results.error")}</AlertTitle>
        <AlertDescription>{error?.message}</AlertDescription>
      </Alert>
    );
  }

  if (!results) {
    return null;
  }

  if (results.totalCount === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        {t("company.search.results.noResults")}
      </div>
    );
  }

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(results.totalCount / limit);
  const hasPrev = offset > 0;
  const hasNext = offset + limit < results.totalCount;

  return (
    <div className="space-y-6">
      <div className="text-muted-foreground text-sm">
        {t("company.search.results.found", { count: results.totalCount })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {results.companies.map((company) => (
          <CompanyResultCard key={company.ico} company={company} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-4">
          <Button
            aria-label={t("company.search.results.prevPage")}
            variant="outline"
            size="sm"
            disabled={!hasPrev}
            onClick={() => onPageChange(Math.max(0, offset - limit))}
          >
            <ChevronLeftIcon aria-hidden="true" className="size-4" />
          </Button>
          <span className="text-muted-foreground text-sm">
            {currentPage} / {totalPages}
          </span>
          <Button
            aria-label={t("company.search.results.nextPage")}
            variant="outline"
            size="sm"
            disabled={!hasNext}
            onClick={() => onPageChange(offset + limit)}
          >
            <ChevronRightIcon aria-hidden="true" className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
