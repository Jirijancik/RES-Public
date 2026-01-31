"use client";

import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { ArrowLeftIcon, AlertCircleIcon, ChevronDownIcon, CopyIcon, CheckIcon } from "lucide-react";
import { useAresSubjectByIco } from "@/lib/ares";
import type { AresBusinessRecord, AresRegistrationStatuses } from "@/lib/ares";
import { Container } from "@/components/ui/container";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { CopyButton } from "@/components/ui/copy-button";
import { Link } from "@/components/ui/link";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { formatAddress, formatDate, REGISTRATION_LABELS } from "./utils";

const SubjectMap = dynamic(() => import("./subject-map").then((mod) => mod.SubjectMap), {
  ssr: false,
  loading: () => (
    <div className="bg-muted flex h-[250px] items-center justify-center rounded-lg">
      <Spinner className="size-5" />
    </div>
  ),
});

interface SubjectDetailProps {
  ico: string;
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

export function SubjectDetail({ ico }: SubjectDetailProps) {
  const { t } = useTranslation("forms");
  const { data: subject, isLoading, isError } = useAresSubjectByIco(ico);

  if (isLoading) {
    return (
      <Container size="xl">
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <Spinner className="size-6" />
          <p className="text-muted-foreground text-sm">{t("ares.detail.loading")}</p>
        </div>
      </Container>
    );
  }

  if (isError || !subject) {
    return (
      <Container size="xl">
        <div className="space-y-4 py-12">
          <BackLink label={t("ares.detail.backToSearch")} />
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>{t("ares.detail.error")}</AlertTitle>
          </Alert>
        </div>
      </Container>
    );
  }

  const record = subject.records.find((r) => r.isPrimaryRecord) ?? subject.records[0];

  if (!record) {
    return (
      <Container size="xl">
        <div className="space-y-4 py-12">
          <BackLink label={t("ares.detail.backToSearch")} />
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>{t("ares.detail.error")}</AlertTitle>
          </Alert>
        </div>
      </Container>
    );
  }

  const address = formatAddress(record.headquarters);
  const isTerminated = Boolean(record.terminationDate);
  const activeRegistrations = record.registrationStatuses
    ? (Object.entries(record.registrationStatuses) as [keyof AresRegistrationStatuses, string | undefined][]).filter(
        ([, value]) => value != null
      )
    : [];

  return (
    <Container size="xl">
      <div className="space-y-6 py-8">
        <BackLink label={t("ares.detail.backToSearch")} />

        {/* Header */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{record.businessName}</h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isTerminated
                  ? "bg-destructive/10 text-destructive"
                  : "bg-green-500/10 text-green-700 dark:text-green-400"
              }`}
            >
              {isTerminated ? t("ares.detail.terminated") : t("ares.detail.active")}
            </span>
          </div>
          <p className="text-muted-foreground font-mono text-sm sm:text-base">
            {t("ares.fields.ico")}: {record.ico}
          </p>
        </div>

        <Separator />

        {/* Responsive two-column grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column: main info */}
          <div className="space-y-6 lg:col-span-2">
            <BasicInfoSection record={record} t={t} />

            {/* NACE Activities */}
            {record.naceActivities && record.naceActivities.length > 0 && (
              <Collapsible>
                <Card>
                  <CardHeader>
                    <CollapsibleTrigger className="flex w-full items-center justify-between">
                      <CardTitle>{t("ares.detail.naceActivities")}</CardTitle>
                      <ChevronDownIcon className="text-muted-foreground size-5 transition-transform [[data-state=open]_&]:rotate-180" />
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        {record.naceActivities.map((code) => (
                          <li key={code} className="font-mono">
                            {code}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* Registration Statuses */}
            {activeRegistrations.length > 0 && (
              <Collapsible>
                <Card>
                  <CardHeader>
                    <CollapsibleTrigger className="flex w-full items-center justify-between">
                      <CardTitle>{t("ares.detail.registrations")}</CardTitle>
                      <ChevronDownIcon className="text-muted-foreground size-5 transition-transform [[data-state=open]_&]:rotate-180" />
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                        {activeRegistrations.map(([key, value]) => (
                          <DetailRow key={key} label={REGISTRATION_LABELS[key]}>
                            {value}
                          </DetailRow>
                        ))}
                      </dl>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}
          </div>

          {/* Right column: map + address */}
          <div className="space-y-6">
            {record.headquarters && (
              <div className="lg:sticky lg:top-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("ares.detail.headquarters")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <SubjectMap headquarters={record.headquarters} />
                    <HeadquartersDetails record={record} address={address} t={t} />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Delivery Address */}
            {record.deliveryAddress &&
              (record.deliveryAddress.addressLine1 ||
                record.deliveryAddress.addressLine2 ||
                record.deliveryAddress.addressLine3) && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t("ares.detail.deliveryAddress")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      {record.deliveryAddress.addressLine1 && <p>{record.deliveryAddress.addressLine1}</p>}
                      {record.deliveryAddress.addressLine2 && <p>{record.deliveryAddress.addressLine2}</p>}
                      {record.deliveryAddress.addressLine3 && <p>{record.deliveryAddress.addressLine3}</p>}
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>
        </div>
      </div>
    </Container>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href="/">
        <ArrowLeftIcon />
        {label}
      </Link>
    </Button>
  );
}

function BasicInfoSection({ record, t }: { record: AresBusinessRecord; t: (key: string) => string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("ares.detail.basicInfo")}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <DetailRow label={t("ares.fields.ico")}>
            <CopyableValue value={record.ico} />
          </DetailRow>

          {record.vatId && (
            <DetailRow label={t("ares.fields.vatId")}>
              <CopyableValue value={record.vatId} />
            </DetailRow>
          )}

          {record.slovakVatId && (
            <DetailRow label={t("ares.fields.slovakVatId")}>
              <CopyableValue value={record.slovakVatId} />
            </DetailRow>
          )}

          {record.legalForm && (
            <DetailRow label={t("ares.fields.legalForm")}>{record.legalForm}</DetailRow>
          )}

          {record.taxOffice && (
            <DetailRow label={t("ares.fields.taxOffice")}>{record.taxOffice}</DetailRow>
          )}

          {record.foundationDate && (
            <DetailRow label={t("ares.fields.foundationDate")}>{formatDate(record.foundationDate)}</DetailRow>
          )}

          {record.terminationDate && (
            <DetailRow label={t("ares.fields.terminationDate")}>{formatDate(record.terminationDate)}</DetailRow>
          )}

          {record.updateDate && (
            <DetailRow label={t("ares.fields.updateDate")}>{formatDate(record.updateDate)}</DetailRow>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}

function HeadquartersDetails({
  record,
  address,
  t,
}: {
  record: AresBusinessRecord;
  address: string | null;
  t: (key: string) => string;
}) {
  const hq = record.headquarters!;

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      {address && <DetailRow label={t("ares.fields.address")}>{address}</DetailRow>}

      {hq.postalCode && <DetailRow label={t("ares.fields.postalCode")}>{hq.postalCode}</DetailRow>}

      {hq.regionName && <DetailRow label={t("ares.fields.region")}>{hq.regionName}</DetailRow>}

      {hq.districtName && <DetailRow label={t("ares.fields.district")}>{hq.districtName}</DetailRow>}

      {hq.countryName && <DetailRow label={t("ares.fields.country")}>{hq.countryName}</DetailRow>}
    </dl>
  );
}
