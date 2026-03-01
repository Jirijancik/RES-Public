"use client";

import { useTranslation } from "react-i18next";
import { ChevronDownIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCzechDate, formatJusticeAddress } from "@/components/company/shared";
import { SourceFooter } from "@/components/company/source-footer";
import type { JusticeEntityDetail, JusticeFact, JusticePerson } from "@/lib/justice/justice.types";

interface RegistryCardProps {
  entity: JusticeEntityDetail | undefined;
  isLoading: boolean;
}

function PersonInfo({ person }: { person: JusticePerson }) {
  if (person.isNaturalPerson) {
    const parts = [person.titleBefore, person.firstName, person.lastName, person.titleAfter]
      .filter(Boolean)
      .join(" ");
    const birthDate = formatCzechDate(person.birthDate);
    return (
      <span className="text-sm">
        {parts}
        {birthDate ? <span className="text-muted-foreground ml-1">(*{birthDate})</span> : null}
      </span>
    );
  }

  return (
    <span className="text-sm">
      {person.entityName}
      {person.entityIco ? (
        <span className="text-muted-foreground ml-1 font-mono">{person.entityIco}</span>
      ) : null}
    </span>
  );
}

function formatValueData(valueData: Record<string, unknown> | null): string | null {
  if (!valueData) return null;
  const vklad = valueData.vklad as { textValue?: string; typ?: string } | undefined;
  if (vklad?.textValue) {
    const amount = Number(vklad.textValue).toLocaleString("cs-CZ");
    return vklad.typ === "KORUNY" ? `${amount} Kč` : amount;
  }
  const parts: string[] = [];
  const souhrn = valueData.souhrn as { textValue?: string; typ?: string } | undefined;
  const splaceni = valueData.splaceni as { textValue?: string; typ?: string } | undefined;
  if (vklad?.textValue) parts.push(`Vklad: ${Number(vklad.textValue).toLocaleString("cs-CZ")} Kč`);
  if (souhrn?.textValue) parts.push(`Podíl: ${souhrn.textValue}%`);
  if (splaceni?.textValue) parts.push(`Splaceno: ${splaceni.textValue}%`);
  return parts.length > 0 ? parts.join(", ") : null;
}

function FactCard({ fact, depth = 0, hideHeader }: { fact: JusticeFact; depth?: number; hideHeader?: boolean }) {
  const { t } = useTranslation("forms");
  const regDate = formatCzechDate(fact.registrationDate);
  const delDate = formatCzechDate(fact.deletionDate);

  const showValueText = fact.valueText
    && fact.valueText !== fact.header
    && !["AngazmaFyzicke", "Spolecnik", "INDIVIDUALNI_SRO"].includes(fact.valueText);

  const formattedValueData = formatValueData(fact.valueData as Record<string, unknown> | null);

  return (
    <div className={depth > 0 ? "border-muted border-l-2 pl-3 mt-1" : ""}>
      <div className="space-y-0.5">
        {fact.header && !hideHeader ? (
          <div className="text-sm font-medium">{fact.header}</div>
        ) : null}

        {showValueText ? (
          <div className="text-muted-foreground text-sm">{fact.valueText}</div>
        ) : null}

        {formattedValueData ? (
          <div className="text-muted-foreground text-sm">{formattedValueData}</div>
        ) : null}

        {fact.person ? (
          <div className="flex items-center gap-2">
            <PersonInfo person={fact.person} />
          </div>
        ) : null}

        {fact.addresses.map((addr, i) => {
          const formatted = formatJusticeAddress(addr);
          return formatted ? (
            <div key={`${addr.municipality}-${addr.street}-${i}`} className="text-muted-foreground text-sm">
              {formatted}
            </div>
          ) : null;
        })}

        {(regDate || delDate) ? (
          <div className="text-muted-foreground text-xs">
            {regDate ? <span>{t("company.common.registered")}: {regDate}</span> : null}
            {regDate && delDate ? <span className="mx-1">|</span> : null}
            {delDate ? <span className="text-destructive">{t("company.common.deleted")}: {delDate}</span> : null}
          </div>
        ) : null}
      </div>

      {fact.subFacts.length > 0 ? (
        <div className="mt-1 space-y-1">
          {fact.subFacts.map((sf, i) => (
            <FactCard key={`${sf.factTypeCode}-${sf.registrationDate || ""}-${i}`} fact={sf} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FactGroupRow({ groupName, facts }: { groupName: string; facts: JusticeFact[] }) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="hover:bg-muted/50 -mx-6 flex w-[calc(100%+3rem)] cursor-pointer items-center justify-between px-6 py-3 text-sm transition-colors">
        <span className="font-medium">{groupName}</span>
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">({facts.length})</span>
          <ChevronDownIcon className="text-muted-foreground size-4 transition-transform in-data-[state=open]:rotate-180" />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 pb-3">
          {facts.map((fact, i) => (
            <FactCard key={`${fact.registrationDate || ""}-${fact.valueText || ""}-${i}`} fact={fact} hideHeader />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function RegistryCard({ entity, isLoading }: RegistryCardProps) {
  const { t } = useTranslation("forms");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("company.cards.registry.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!entity || entity.facts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("company.cards.registry.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("company.detail.noData")}</p>
        </CardContent>
      </Card>
    );
  }

  // Group top-level facts by factTypeName
  const topLevelFacts = entity.facts.filter((f) => f.factTypeCode);
  const factGroups = new Map<string, JusticeFact[]>();
  for (const fact of topLevelFacts) {
    const key = fact.factTypeName || fact.factTypeCode;
    if (!factGroups.has(key)) factGroups.set(key, []);
    factGroups.get(key)!.push(fact);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("company.cards.registry.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {Array.from(factGroups.entries()).map(([groupName, facts]) => (
            <FactGroupRow key={groupName} groupName={groupName} facts={facts} />
          ))}
        </div>
      </CardContent>
      <SourceFooter source={t("company.cards.registry.source")} />
    </Card>
  );
}
