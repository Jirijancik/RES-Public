"use client";

import { useTranslation } from "react-i18next";
import { ChevronDownIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { DetailRow } from "@/components/company/shared";
import { SourceFooter } from "@/components/company/source-footer";
import type { AresBusinessRecord } from "@/lib/ares";

interface ActivityCardProps {
  record: AresBusinessRecord | undefined;
  isLoading: boolean;
}

export function ActivityCard({ record, isLoading }: ActivityCardProps) {
  const { t } = useTranslation("forms");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("company.cards.activity.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!record) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("company.cards.activity.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("company.detail.noData")}</p>
        </CardContent>
      </Card>
    );
  }

  const hasNace = record.naceActivities && record.naceActivities.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("company.cards.activity.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Employee category */}
        {record.statisticalData?.employeeCountCategory ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <DetailRow label={t("company.header.employees")}>
              {record.statisticalData.employeeCountCategory}
            </DetailRow>
          </dl>
        ) : null}

        {/* NACE Activities — collapsible */}
        {hasNace ? (
          <Collapsible>
            <CollapsibleTrigger className="flex w-full items-center justify-between text-sm">
              <span className="font-medium">{t("ares.detail.naceActivities")}</span>
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">
                  ({record.naceActivities!.length})
                </span>
                <ChevronDownIcon className="text-muted-foreground size-4 transition-transform in-data-[state=open]:rotate-180" />
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="mt-2 space-y-1 text-sm">
                {record.naceActivities!.map((code) => (
                  <li key={code} className="font-mono">
                    {code}
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <p className="text-muted-foreground text-sm">{t("company.detail.noData")}</p>
        )}
      </CardContent>
      <SourceFooter source={t("company.cards.activity.source")} />
    </Card>
  );
}
