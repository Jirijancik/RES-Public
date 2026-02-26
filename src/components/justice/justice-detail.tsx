"use client";

import { useTranslation } from "react-i18next";
import { ArrowLeftIcon, AlertCircleIcon, ChevronDownIcon, CheckIcon, CopyIcon } from "lucide-react";
import { useJusticeEntityByIco, type JusticeFact, type JusticePerson } from "@/lib/justice";
import { Container } from "@/components/ui/container";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { CopyButton } from "@/components/ui/copy-button";
import { Link } from "@/components/ui/link";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

interface JusticeDetailProps {
  ico: string;
}

function formatDate(date: string | null | undefined): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("cs-CZ").format(parsed);
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

function FactCard({ fact, depth = 0 }: { fact: JusticeFact; depth?: number }) {
  const regDate = formatDate(fact.registrationDate);
  const delDate = formatDate(fact.deletionDate);
  const hasContent = fact.valueText || fact.person || fact.addresses.length > 0 || fact.subFacts.length > 0;

  return (
    <div className={depth > 0 ? "border-l-2 border-muted pl-4 mt-2" : ""}>
      <div className="space-y-1">
        {fact.header ? (
          <div className="text-sm font-medium">{fact.header}</div>
        ) : null}

        {fact.valueText ? (
          <div className="text-muted-foreground text-sm">{fact.valueText}</div>
        ) : null}

        {fact.person ? (
          <div className="flex items-center gap-2">
            <PersonInfo person={fact.person} />
          </div>
        ) : null}

        {fact.addresses.map((addr, i) => (
          <div key={i} className="text-muted-foreground text-sm">
            {addr.fullAddress}
          </div>
        ))}

        {(regDate || delDate) ? (
          <div className="text-muted-foreground text-xs">
            {regDate ? <span>Zapsáno: {regDate}</span> : null}
            {regDate && delDate ? <span className="mx-1">|</span> : null}
            {delDate ? <span className="text-destructive">Vymazáno: {delDate}</span> : null}
          </div>
        ) : null}
      </div>

      {fact.subFacts.length > 0 ? (
        <div className="mt-2 space-y-2">
          {fact.subFacts.map((sf, i) => (
            <FactCard key={i} fact={sf} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
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

  // Extract persons and addresses from facts for the right column
  const allPersons = entity.facts
    .filter((f) => f.person)
    .map((f) => ({ person: f.person!, functionName: f.functionName || f.header }));

  const allAddresses = entity.facts.flatMap((f) => f.addresses);

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

        {/* Responsive two-column grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column: main info + facts */}
          <div className="space-y-6 lg:col-span-2">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>{t("justice.detail.basicInfo")}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <DetailRow label={t("justice.fields.ico")}>
                    <CopyableValue value={entity.ico} />
                  </DetailRow>

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
                </dl>
              </CardContent>
            </Card>

            {/* Facts grouped by type */}
            {Array.from(factGroups.entries()).map(([groupName, facts]) => (
              <Collapsible key={groupName}>
                <Card>
                  <CardHeader>
                    <CollapsibleTrigger className="flex w-full items-center justify-between">
                      <CardTitle>
                        {groupName}
                        <span className="text-muted-foreground ml-2 text-sm font-normal">
                          ({facts.length})
                        </span>
                      </CardTitle>
                      <ChevronDownIcon className="text-muted-foreground size-5 transition-transform in-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <div className="space-y-4">
                        {facts.map((fact, i) => (
                          <FactCard key={i} fact={fact} />
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>

          {/* Right column: persons + addresses */}
          <div className="space-y-6">
            {/* Persons */}
            {allPersons.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("justice.detail.persons")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allPersons.map((item, i) => (
                      <div key={i} className="space-y-0.5">
                        <PersonInfo person={item.person} />
                        {item.functionName ? (
                          <div className="text-muted-foreground text-xs">{item.functionName}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Addresses */}
            {allAddresses.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("justice.detail.addresses")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allAddresses.map((addr, i) => (
                      <div key={i} className="space-y-0.5">
                        <div className="text-sm">{addr.fullAddress}</div>
                        {addr.addressType ? (
                          <div className="text-muted-foreground text-xs capitalize">
                            {addr.addressType}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
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
