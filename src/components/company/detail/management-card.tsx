"use client";

import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCzechDate } from "@/components/company/shared";
import { SourceFooter } from "@/components/company/source-footer";
import type { JusticePersonWithFact } from "@/lib/justice/justice.types";

interface ManagementCardProps {
  persons: JusticePersonWithFact[] | undefined;
  isLoading: boolean;
}

function PersonEntry({ person }: { person: JusticePersonWithFact }) {
  const { t } = useTranslation("forms");

  const name = person.isNaturalPerson
    ? [person.titleBefore, person.firstName, person.lastName, person.titleAfter]
        .filter(Boolean)
        .join(" ")
    : person.entityName;

  const birthDate = person.isNaturalPerson ? formatCzechDate(person.birthDate) : null;
  const fromDate = formatCzechDate(person.functionFrom || person.membershipFrom);
  const toDate = formatCzechDate(person.functionTo || person.membershipTo);
  const delDate = formatCzechDate(person.deletionDate);

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2">
        {person.functionName ? (
          <span className="text-muted-foreground text-sm">{person.functionName}:</span>
        ) : null}
        <span className="text-sm font-medium">
          {name}
          {birthDate ? (
            <span className="text-muted-foreground ml-1 font-normal">(*{birthDate})</span>
          ) : null}
        </span>
        {!person.isNaturalPerson && person.entityIco ? (
          <span className="text-muted-foreground text-xs font-mono">{person.entityIco}</span>
        ) : null}
      </div>
      {(fromDate || toDate || delDate) ? (
        <div className="text-muted-foreground text-xs">
          {fromDate ? <span>{t("company.common.from")}: {fromDate}</span> : null}
          {fromDate && (toDate || delDate) ? <span className="mx-1">|</span> : null}
          {toDate ? <span>{t("company.common.to")}: {toDate}</span> : null}
          {delDate ? <span className="text-destructive ml-1">({t("company.common.deleted")}: {delDate})</span> : null}
        </div>
      ) : null}
    </div>
  );
}

export function ManagementCard({ persons, isLoading }: ManagementCardProps) {
  const { t } = useTranslation("forms");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("company.cards.management.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!persons || persons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("company.cards.management.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("company.detail.noData")}</p>
        </CardContent>
      </Card>
    );
  }

  // Group by function name
  const groups = new Map<string, JusticePersonWithFact[]>();
  for (const p of persons) {
    const key = p.functionName || t("company.common.other");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("company.cards.management.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from(groups.entries()).map(([groupName, groupPersons]) => (
          <div key={groupName}>
            <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wider">
              {groupName}
            </h4>
            <div className="space-y-2">
              {groupPersons.map((person, i) => (
                <PersonEntry
                  key={`${person.functionName}-${person.lastName || person.entityName}-${i}`}
                  person={person}
                />
              ))}
            </div>
          </div>
        ))}
      </CardContent>
      <SourceFooter source={t("company.cards.management.source")} />
    </Card>
  );
}
