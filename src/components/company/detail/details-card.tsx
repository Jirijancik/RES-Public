"use client";

import { useTranslation } from "react-i18next";
import { ChevronDownIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyableValue, DetailRow, formatDate } from "@/components/company/shared";
import { SourceFooter } from "@/components/company/source-footer";
import { REGISTRATION_LABELS } from "@/components/subject/utils";
import type { AresBusinessRecord, AresRegistrationStatuses } from "@/lib/ares";

interface DetailsCardProps {
  record: AresBusinessRecord | undefined;
  isLoading: boolean;
}

export function DetailsCard({ record, isLoading }: DetailsCardProps) {
  const { t } = useTranslation("forms");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("company.cards.details.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!record) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("company.cards.details.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("company.detail.noData")}</p>
        </CardContent>
      </Card>
    );
  }

  const activeRegistrations = record.registrationStatuses
    ? (
        Object.entries(record.registrationStatuses) as [
          keyof AresRegistrationStatuses,
          string | undefined,
        ][]
      ).filter(([, value]) => value != null)
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("company.cards.details.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <DetailRow label={t("ares.fields.ico")}>
            <CopyableValue value={record.ico} />
          </DetailRow>

          {record.vatId ? (
            <DetailRow label={t("ares.fields.vatId")}>
              <CopyableValue value={record.vatId} />
            </DetailRow>
          ) : null}

          {record.slovakVatId ? (
            <DetailRow label={t("ares.fields.slovakVatId")}>
              <CopyableValue value={record.slovakVatId} />
            </DetailRow>
          ) : null}

          {record.legalForm ? (
            <DetailRow label={t("ares.fields.legalForm")}>{record.legalForm}</DetailRow>
          ) : null}

          {record.taxOffice ? (
            <DetailRow label={t("ares.fields.taxOffice")}>{record.taxOffice}</DetailRow>
          ) : null}

          {record.foundationDate ? (
            <DetailRow label={t("ares.fields.foundationDate")}>
              {formatDate(record.foundationDate)}
            </DetailRow>
          ) : null}

          {record.terminationDate ? (
            <DetailRow label={t("ares.fields.terminationDate")}>
              {formatDate(record.terminationDate)}
            </DetailRow>
          ) : null}

          {record.updateDate ? (
            <DetailRow label={t("ares.fields.updateDate")}>
              {formatDate(record.updateDate)}
            </DetailRow>
          ) : null}
        </dl>

        {/* Registration Statuses — collapsible */}
        {activeRegistrations.length > 0 ? (
          <Collapsible>
            <CollapsibleTrigger className="flex w-full items-center justify-between text-sm">
              <span className="font-medium">{t("ares.detail.registrations")}</span>
              <ChevronDownIcon className="text-muted-foreground size-4 transition-transform in-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                {activeRegistrations.map(([key, value]) => (
                  <DetailRow key={key} label={REGISTRATION_LABELS[key]}>
                    {value}
                  </DetailRow>
                ))}
              </dl>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </CardContent>
      <SourceFooter source={t("company.cards.details.source")} />
    </Card>
  );
}
