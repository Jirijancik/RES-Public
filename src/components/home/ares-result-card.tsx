"use client";

import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import type { AresEconomicSubject } from "@/lib/ares";

interface AresResultCardProps {
  subject: AresEconomicSubject;
}

function formatAddress(headquarters?: {
  streetName?: string;
  buildingNumber?: number;
  orientationNumber?: number;
  municipalityName?: string;
  postalCode?: number;
}): string | null {
  if (!headquarters) return null;

  const parts: string[] = [];

  if (headquarters.streetName) {
    let street = headquarters.streetName;
    if (headquarters.buildingNumber) {
      street += ` ${headquarters.buildingNumber}`;
      if (headquarters.orientationNumber) {
        street += `/${headquarters.orientationNumber}`;
      }
    }
    parts.push(street);
  }

  if (headquarters.municipalityName) {
    if (headquarters.postalCode) {
      parts.push(`${headquarters.postalCode} ${headquarters.municipalityName}`);
    } else {
      parts.push(headquarters.municipalityName);
    }
  }

  return parts.length > 0 ? parts.join(", ") : null;
}

function formatDate(date?: Date): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("cs-CZ").format(date);
}

export function AresResultCard({ subject }: AresResultCardProps) {
  const { t } = useTranslation("forms");

  const primaryRecord = subject.records.find((r) => r.isPrimaryRecord) ?? subject.records[0];

  if (!primaryRecord) return null;

  const address = formatAddress(primaryRecord.headquarters);
  const foundationDate = formatDate(primaryRecord.foundationDate);

  return (
    <Link href={`/subject/${subject.icoId}`} className="block no-underline">
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader>
          <CardTitle>{primaryRecord.businessName}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">{t("ares.fields.ico")}</dt>
            <dd className="font-mono">{primaryRecord.ico}</dd>

            {primaryRecord.legalForm ? <>
                <dt className="text-muted-foreground">{t("ares.fields.legalForm")}</dt>
                <dd>{primaryRecord.legalForm}</dd>
              </> : null}

            {address ? <>
                <dt className="text-muted-foreground">{t("ares.fields.headquarters")}</dt>
                <dd>{address}</dd>
              </> : null}

            {foundationDate ? <>
                <dt className="text-muted-foreground">{t("ares.fields.foundationDate")}</dt>
                <dd>{foundationDate}</dd>
              </> : null}

            {primaryRecord.vatId ? <>
                <dt className="text-muted-foreground">{t("ares.fields.vatId")}</dt>
                <dd className="font-mono">{primaryRecord.vatId}</dd>
              </> : null}
          </dl>
        </CardContent>
      </Card>
    </Link>
  );
}
