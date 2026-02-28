"use client";

import { useTranslation } from "react-i18next";
import { ArrowLeftIcon, AlertCircleIcon, ChevronDownIcon, CheckIcon, CopyIcon } from "lucide-react";
import { useJusticeEntityByIco, type JusticeAddress, type JusticeFact, type JusticePerson } from "@/lib/justice";
import { Container } from "@/components/ui/container";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { CopyButton } from "@/components/ui/copy-button";
import { Link } from "@/components/ui/link";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { JusticeDocumentsSection } from "./justice-documents-section";

interface JusticeDetailProps {
  ico: string;
}

function formatDate(date: string | null | undefined): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("cs-CZ").format(parsed);
}

function formatJusticeAddress(addr: JusticeAddress): string {
  if (addr.fullAddress) return addr.fullAddress;
  const street = addr.street || "";
  const house = [addr.houseNumber, addr.orientationNumber].filter(Boolean).join("/");
  const streetLine = street && house ? `${street} ${house}` : street || house;
  const city = [addr.municipality, addr.cityPart].filter(Boolean).join(" - ");
  return [streetLine, city, addr.postalCode].filter(Boolean).join(", ");
}


function CopyableValue({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono">{value}</span>
      <CopyButton
        toCopy={value}
        className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center transition-colors"
      >
        {({ isCopied }) =>
          isCopied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />
        }
      </CopyButton>
    </span>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

function PersonInfo({ person }: { person: JusticePerson }) {
  if (person.isNaturalPerson) {
    const parts = [person.titleBefore, person.firstName, person.lastName, person.titleAfter]
      .filter(Boolean)
      .join(" ");
    const birthDate = formatDate(person.birthDate);
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
  // Handle vklad (capital) amounts: { vklad: { textValue: "50000", typ: "KORUNY" } }
  const vklad = valueData.vklad as { textValue?: string; typ?: string } | undefined;
  if (vklad?.textValue) {
    const amount = Number(vklad.textValue).toLocaleString("cs-CZ");
    return vklad.typ === "KORUNY" ? `${amount} Kč` : amount;
  }
  // Handle souhrn/splaceni for podíl
  const parts: string[] = [];
  const souhrn = valueData.souhrn as { textValue?: string; typ?: string } | undefined;
  const splaceni = valueData.splaceni as { textValue?: string; typ?: string } | undefined;
  if (vklad?.textValue) parts.push(`Vklad: ${Number(vklad.textValue).toLocaleString("cs-CZ")} Kč`);
  if (souhrn?.textValue) parts.push(`Podíl: ${souhrn.textValue}%`);
  if (splaceni?.textValue) parts.push(`Splaceno: ${splaceni.textValue}%`);
  return parts.length > 0 ? parts.join(", ") : null;
}

function FactCard({ fact, depth = 0, hideHeader }: { fact: JusticeFact; depth?: number; hideHeader?: boolean }) {
  const regDate = formatDate(fact.registrationDate);
  const delDate = formatDate(fact.deletionDate);

  // Skip valueText when it's a redundant label (same as header) or an internal code
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
            <div key={i} className="text-muted-foreground text-sm">
              {formatted}
            </div>
          ) : null;
        })}

        {(regDate || delDate) ? (
          <div className="text-muted-foreground text-xs">
            {regDate ? <span>Zapsáno: {regDate}</span> : null}
            {regDate && delDate ? <span className="mx-1">|</span> : null}
            {delDate ? <span className="text-destructive">Vymazáno: {delDate}</span> : null}
          </div>
        ) : null}
      </div>

      {fact.subFacts.length > 0 ? (
        <div className="mt-1 space-y-1">
          {fact.subFacts.map((sf, i) => (
            <FactCard key={i} fact={sf} depth={depth + 1} />
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
            <FactCard key={i} fact={fact} hideHeader />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function JusticeDetail({ ico }: JusticeDetailProps) {
  const { t } = useTranslation("forms");
  const { data: entity, isLoading, isError } = useJusticeEntityByIco(ico);

  if (isLoading) {
    return (
      <Container size="xl">
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <Spinner className="size-6" />
          <p className="text-muted-foreground text-sm">{t("justice.detail.loading")}</p>
        </div>
      </Container>
    );
  }

  if (isError || !entity) {
    return (
      <Container size="xl">
        <div className="space-y-4 py-12">
          <BackLink label={t("justice.detail.backToSearch")} />
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>{t("justice.detail.error")}</AlertTitle>
          </Alert>
        </div>
      </Container>
    );
  }

  const isDeleted = !entity.isActive;

  // Group top-level facts by factTypeName for collapsible sections
  const topLevelFacts = entity.facts.filter((f) => f.factTypeCode);
  const factGroups = new Map<string, JusticeFact[]>();
  for (const fact of topLevelFacts) {
    const key = fact.factTypeName || fact.factTypeCode;
    if (!factGroups.has(key)) {
      factGroups.set(key, []);
    }
    factGroups.get(key)!.push(fact);
  }

  // Extract obchodní firma (trade name) from název fact for basic info
  const nazevFact = entity.facts.find((f) => f.factTypeCode === "NAZEV");

  // Extract statutární orgán members for basic info
  const statOrganFact = entity.facts.find((f) => f.factTypeCode === "STATUTARNI_ORGAN");
  const organMembers = statOrganFact?.subFacts.filter((sf) => sf.person) ?? [];
  const zpusobJednani = statOrganFact?.subFacts.find((sf) => sf.factTypeCode === "ZPUSOB_JEDNANI");

  // Extract only entity-level addresses (sídlo) for the sidebar, not person addresses
  const allAddresses = entity.facts
    .filter((f) => f.factTypeName?.toLowerCase().includes("sídlo"))
    .flatMap((f) => [...f.addresses, ...f.subFacts.flatMap((sf) => sf.addresses)]);

  return (
    <Container size="xl">
      <div className="space-y-6 py-8">
        <BackLink label={t("justice.detail.backToSearch")} />

        {/* Header */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{entity.name}</h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isDeleted
                  ? "bg-destructive/10 text-destructive"
                  : "bg-green-500/10 text-green-700 dark:text-green-400"
              }`}
            >
              {isDeleted ? t("justice.detail.deleted") : t("justice.detail.active")}
            </span>
          </div>
          <p className="text-muted-foreground font-mono text-sm sm:text-base">
            {t("justice.fields.ico")}: {entity.ico}
          </p>
        </div>

        <Separator />

        {/* Two-column grid: Basic Info + Registry Data */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left column: basic info with address */}
          <Card>
            <CardHeader>
              <CardTitle>{t("justice.detail.basicInfo")}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <DetailRow label={t("justice.fields.ico")}>
                  <CopyableValue value={entity.ico} />
                </DetailRow>

                {nazevFact ? (
                  <DetailRow label={nazevFact.header || t("justice.fields.name")}>
                    <div>
                      <div>{nazevFact.valueText}</div>
                      {nazevFact.registrationDate ? (
                        <div className="text-muted-foreground text-xs">
                          Zapsáno: {formatDate(nazevFact.registrationDate)}
                        </div>
                      ) : null}
                    </div>
                  </DetailRow>
                ) : null}

                {entity.legalFormName ? (
                  <DetailRow label={t("justice.fields.legalForm")}>
                    {entity.legalFormName}
                  </DetailRow>
                ) : null}

                {entity.courtName ? (
                  <DetailRow label={t("justice.fields.court")}>{entity.courtName}</DetailRow>
                ) : null}

                {entity.fileReference ? (
                  <DetailRow label={t("justice.fields.fileReference")}>
                    <CopyableValue value={entity.fileReference} />
                  </DetailRow>
                ) : null}

                {entity.registrationDate ? (
                  <DetailRow label={t("justice.fields.registrationDate")}>
                    {formatDate(entity.registrationDate)}
                  </DetailRow>
                ) : null}

                {entity.deletionDate ? (
                  <DetailRow label={t("justice.fields.deletionDate")}>
                    {formatDate(entity.deletionDate)}
                  </DetailRow>
                ) : null}

                {allAddresses.length > 0 ? (
                  <DetailRow label={t("justice.detail.addresses")}>
                    <div className="space-y-1">
                      {allAddresses.map((addr, i) => {
                        const formatted = formatJusticeAddress(addr);
                        return formatted ? <div key={i}>{formatted}</div> : null;
                      })}
                    </div>
                  </DetailRow>
                ) : null}

                {organMembers.length > 0 ? (
                  <DetailRow label={statOrganFact?.header || "Statutární orgán"}>
                    <div className="space-y-1.5">
                      {organMembers.map((member, i) => (
                        <div key={i}>
                          <div className="flex items-center gap-1.5">
                            {member.functionName ? (
                              <span className="text-muted-foreground">{member.functionName}:</span>
                            ) : null}
                            {member.person ? <PersonInfo person={member.person} /> : null}
                          </div>
                          {member.addresses.map((addr, j) => {
                            const formatted = formatJusticeAddress(addr);
                            return formatted ? (
                              <div key={j} className="text-muted-foreground text-xs">{formatted}</div>
                            ) : null;
                          })}
                        </div>
                      ))}
                    </div>
                  </DetailRow>
                ) : null}

                {zpusobJednani?.valueText ? (
                  <DetailRow label={zpusobJednani.header || "Způsob jednání"}>
                    {zpusobJednani.valueText}
                  </DetailRow>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          {/* Right column: registry data */}
          {factGroups.size > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("justice.detail.facts")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {Array.from(factGroups.entries()).map(([groupName, facts]) => (
                    <FactGroupRow key={groupName} groupName={groupName} facts={facts} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sbírka listin — lazy loaded */}
        <JusticeDocumentsSection ico={ico} />
      </div>
    </Container>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href="/justice">
        <ArrowLeftIcon />
        {label}
      </Link>
    </Button>
  );
}
