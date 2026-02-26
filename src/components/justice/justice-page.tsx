"use client";

import { useTranslation } from "react-i18next";
import { Container } from "@/components/ui/container";
import { useJusticeSearch } from "@/lib/justice";
import { JusticeSearchForm } from "./justice-search-form";
import { JusticeSearchResults } from "./justice-search-results";

export function JusticePage() {
  const { t } = useTranslation("forms");

  const { mutate: search, data: results, error, isPending, isError, reset } = useJusticeSearch();

  return (
    <div className="space-y-16 pb-24 md:space-y-32">
      <Container asChild>
        <section className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">{t("justice.title")}</h1>
          <p className="text-muted-foreground">{t("justice.description")}</p>
        </section>
      </Container>

      <Container asChild>
        <section className="space-y-8">
          <JusticeSearchForm onSearch={search} isPending={isPending} onReset={reset} />

          <JusticeSearchResults results={results} isError={isError} error={error} />
        </section>
      </Container>
    </div>
  );
}
