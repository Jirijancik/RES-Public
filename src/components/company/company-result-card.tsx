"use client";

import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Route } from "next";
import { Link } from "@/components/ui/link";
import { StatusBadge } from "./shared";
import type { CompanySummary } from "@/lib/company/company.types";

interface CompanyResultCardProps {
  company: CompanySummary;
}

export function CompanyResultCard({ company }: CompanyResultCardProps) {
  const { t } = useTranslation("forms");

  return (
    <Link href={`/company/${company.ico}` as Route} className="block no-underline">
      <Card className="hover:border-primary/50 h-full cursor-pointer transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2">{company.name}</CardTitle>
            <StatusBadge
              isActive={company.isActive}
              activeLabel={t("company.header.active")}
              inactiveLabel={t("company.header.inactive")}
            />
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">{t("company.header.ico")}</dt>
            <dd className="font-mono">{company.ico}</dd>

            {company.legalForm ? (
              <>
                <dt className="text-muted-foreground">{t("company.header.legalForm")}</dt>
                <dd>{company.legalForm}</dd>
              </>
            ) : null}

            {company.regionName ? (
              <>
                <dt className="text-muted-foreground">{t("company.header.region")}</dt>
                <dd>{company.regionName}</dd>
              </>
            ) : null}

            {company.employeeCategory ? (
              <>
                <dt className="text-muted-foreground">{t("company.header.employees")}</dt>
                <dd>{company.employeeCategory}</dd>
              </>
            ) : null}

            {company.nacePrimary ? (
              <>
                <dt className="text-muted-foreground">{t("company.common.nace")}</dt>
                <dd className="font-mono">{company.nacePrimary}</dd>
              </>
            ) : null}
          </dl>
        </CardContent>
      </Card>
    </Link>
  );
}
