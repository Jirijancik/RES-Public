"use client";

import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import type { JusticeEntitySummary } from "@/lib/justice";

interface JusticeResultCardProps {
  entity: JusticeEntitySummary;
}

function formatDate(date: string | null, locale: string): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat(locale).format(parsed);
}

export function JusticeResultCard({ entity }: JusticeResultCardProps) {
  const { t, i18n } = useTranslation("forms");

  const registrationDate = formatDate(entity.registrationDate, i18n.language);

  return (
    <Link href={`/justice/${entity.ico}`} className="block no-underline">
      <Card className="hover:border-primary/50 cursor-pointer transition-colors">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="flex-1">{entity.name}</CardTitle>
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                entity.isActive
                  ? "bg-green-500/10 text-green-700 dark:text-green-400"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {entity.isActive ? t("justice.detail.active") : t("justice.detail.deleted")}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">{t("justice.fields.ico")}</dt>
            <dd className="font-mono">{entity.ico}</dd>

            {entity.legalFormName ? (
              <>
                <dt className="text-muted-foreground">{t("justice.fields.legalForm")}</dt>
                <dd>{entity.legalFormName}</dd>
              </>
            ) : null}

            {entity.courtName ? (
              <>
                <dt className="text-muted-foreground">{t("justice.fields.court")}</dt>
                <dd>{entity.courtName}</dd>
              </>
            ) : null}

            {entity.fileReference ? (
              <>
                <dt className="text-muted-foreground">{t("justice.fields.fileReference")}</dt>
                <dd className="font-mono">{entity.fileReference}</dd>
              </>
            ) : null}

            {registrationDate ? (
              <>
                <dt className="text-muted-foreground">{t("justice.fields.registrationDate")}</dt>
                <dd>{registrationDate}</dd>
              </>
            ) : null}
          </dl>
        </CardContent>
      </Card>
    </Link>
  );
}
