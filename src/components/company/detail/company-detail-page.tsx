"use client";

import { useTranslation } from "react-i18next";
import { AlertCircleIcon } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { BackLink } from "@/components/company/shared";
import { useCompanyByIco } from "@/lib/company/company.queries";
import { useAresSubjectByIco } from "@/lib/ares/ares.queries";
import { useJusticeEntityByIco, useJusticePersons } from "@/lib/justice/justice.queries";
import { CompanyHeader } from "./company-header";
import { AddressCard } from "./address-card";
import { DetailsCard } from "./details-card";
import { ActivityCard } from "./activity-card";
import { ManagementCard } from "./management-card";
import { RegistryCard } from "./registry-card";
import { DocumentsCard } from "./documents-card";

interface CompanyDetailPageProps {
  ico: string;
}

export function CompanyDetailPage({ ico }: CompanyDetailPageProps) {
  const { t } = useTranslation("forms");

  // Hub data — instant from DB
  const {
    data: company,
    isLoading: companyLoading,
    isError: companyError,
  } = useCompanyByIco(ico);

  // ARES spoke — auto-fetches in parallel, DB-backed
  const {
    data: aresSubject,
    isLoading: aresLoading,
  } = useAresSubjectByIco(ico);

  // Justice spoke — auto-fetches in parallel, DB-backed
  const {
    data: justiceEntity,
    isLoading: justiceEntityLoading,
  } = useJusticeEntityByIco(ico);

  const {
    data: justicePersons,
    isLoading: justicePersonsLoading,
  } = useJusticePersons(ico);

  // Extract primary ARES record
  const aresRecord = aresSubject?.records.find((r) => r.isPrimaryRecord) ?? aresSubject?.records[0];

  // Loading state for hub
  if (companyLoading) {
    return (
      <Container size="xl">
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <Spinner className="size-6" />
          <p className="text-muted-foreground text-sm">{t("company.detail.loading")}</p>
        </div>
      </Container>
    );
  }

  // Error state
  if (companyError || !company) {
    return (
      <Container size="xl">
        <div className="space-y-4 py-12">
          <BackLink label={t("company.detail.backToSearch")} href="/" />
          <Alert variant="destructive">
            <AlertCircleIcon aria-hidden="true" />
            <AlertTitle>{t("company.detail.notFound")}</AlertTitle>
          </Alert>
        </div>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <div className="space-y-6 py-8">
        {/* ❶ Company Header — hub data, instant */}
        <CompanyHeader company={company} />

        {/* Card stack */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left column */}
          <div className="space-y-6">
            {/* ❷ Address card — ARES */}
            <AddressCard record={aresRecord} isLoading={aresLoading} />

            {/* ❹ Activity card — ARES */}
            <ActivityCard record={aresRecord} isLoading={aresLoading} />

            {/* ❺ Management card — Justice persons */}
            <ManagementCard persons={justicePersons} isLoading={justicePersonsLoading} />
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* ❸ Details card — ARES */}
            <DetailsCard record={aresRecord} isLoading={aresLoading} />

            {/* ❻ Registry card — Justice entity */}
            <RegistryCard entity={justiceEntity} isLoading={justiceEntityLoading} />
          </div>
        </div>

        {/* ❼ Documents card — lazy, full width */}
        <DocumentsCard ico={ico} />
      </div>
    </Container>
  );
}
