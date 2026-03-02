"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Container } from "@/components/ui/container";
import { useCompanySearch } from "@/lib/company/company.queries";
import { CompanySearchForm } from "./company-search-form";
import { CompanySearchResults } from "./company-search-results";
import type { CompanySearchParams } from "@/lib/company/company.types";

export function CompanySearchPage() {
  const { t } = useTranslation("forms");

  const [params, setParams] = useState<CompanySearchParams>({
    status: "active",
    limit: 25,
    offset: 0,
  });

  // Only enable query when user has submitted a search (name or specific filter)
  const hasSearchCriteria = Boolean(params.name || params.ico || params.regionCode || params.legalForm || params.nace);

  const { data, isLoading, isError, error } = useCompanySearch(params, {
    enabled: hasSearchCriteria,
  });

  function handleSearch(newParams: CompanySearchParams) {
    setParams({ ...newParams, offset: 0, limit: params.limit });
  }

  function handlePageChange(newOffset: number) {
    setParams((prev) => ({ ...prev, offset: newOffset }));
  }

  return (
    <div className="space-y-16 pb-24 md:space-y-32">
      <Container asChild>
        <section className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">{t("company.search.title")}</h1>
          <p className="text-muted-foreground">{t("company.search.description")}</p>
        </section>
      </Container>

      <Container asChild>
        <section className="space-y-8">
          <CompanySearchForm
            onSearch={handleSearch}
            isPending={isLoading ? hasSearchCriteria : false}
          />

          {hasSearchCriteria ? (
            <CompanySearchResults
              results={data}
              isLoading={isLoading}
              isError={isError}
              error={error}
              offset={params.offset ?? 0}
              limit={params.limit ?? 25}
              onPageChange={handlePageChange}
            />
          ) : null}
        </section>
      </Container>
    </div>
  );
}
