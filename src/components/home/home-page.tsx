"use client";

import { useTranslation } from "react-i18next";
import { Container } from "@/components/ui/container";
import { useAresSearchMutation } from "@/lib/ares";
import { AresSearchForm } from "./ares-search-form";
import { AresSearchResults } from "./ares-search-results";

export function HomePage() {
  const { t } = useTranslation("forms");

  const { search, data: results, error, isPending, isError, reset } = useAresSearchMutation();

  return (
    <div className="space-y-16 pb-24 md:space-y-32">
      <Container asChild>
        <section className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">{t("ares.title")}</h1>
          <p className="text-muted-foreground">{t("ares.description")}</p>
        </section>
      </Container>

      <Container asChild>
        <section className="space-y-8">
          <AresSearchForm onSearch={search} isPending={isPending} onReset={reset} />

          <AresSearchResults results={results} isError={isError} error={error} />
        </section>
      </Container>
    </div>
  );
}
