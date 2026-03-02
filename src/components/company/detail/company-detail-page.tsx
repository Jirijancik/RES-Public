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
    <Container className="3xl:[--container-max-width:var(--breakpoint-3xl)]">
      <div className="space-y-6 py-8">
        {/* Company Header — hub data, instant */}
        <CompanyHeader
          name={company.name}
          ico={company.ico}
          isActive={company.isActive}
          justice={company.sources.justice}
        />

        {/* Card grid — 1 col → 2 col (lg) → 3 col (3xl) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 3xl:grid-cols-3">
          {/* Col 1: geographic / operational */}
          <div className="space-y-6">
            <AddressCard record={aresRecord} isLoading={aresLoading} />
            <ActivityCard record={aresRecord} isLoading={aresLoading} />
          </div>

          {/* Col 2: regulatory / details */}
          <div className="space-y-6">
            <DetailsCard record={aresRecord} isLoading={aresLoading} />
            <RegistryCard entity={justiceEntity} isLoading={justiceEntityLoading} />
          </div>

          {/* Management — full-width row at lg, 3rd column at 3xl */}
          <div className="space-y-6 lg:col-span-2 3xl:col-span-1 3xl:row-start-1">
            <ManagementCard persons={justicePersons} isLoading={justicePersonsLoading} />
          </div>
        </div>

        {/* Documents card — lazy, full width */}
        <DocumentsCard ico={ico} />
      </div>
    </Container>
  );
}
