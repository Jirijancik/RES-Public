"use client";

import { useTranslation } from "react-i18next";
import { Separator } from "@/components/ui/separator";
import { CopyableValue, StatusBadge, BackLink } from "@/components/company/shared";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import type { JusticeEntitySummary } from "@/lib/justice/justice.types";

interface CompanyHeaderProps {
  name: string;
  ico: string;
  isActive: boolean;
  justice: Pick<JusticeEntitySummary, "legalFormName" | "courtName" | "fileReference"> | null;
}

export function CompanyHeader({ name, ico, isActive, justice }: CompanyHeaderProps) {
  const { t } = useTranslation("forms");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <BackLink label={t("company.detail.backToSearch")} href="/" />
        <LanguageSwitcher />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{name}</h1>
          <StatusBadge
            isActive={isActive}
            activeLabel={t("company.header.active")}
            inactiveLabel={t("company.header.inactive")}
          />
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span>
            {t("company.header.ico")}: <CopyableValue value={ico} />
          </span>
          {justice?.legalFormName ? (
            <span>{justice.legalFormName}</span>
          ) : null}
          {justice?.courtName && justice?.fileReference ? (
            <span>
              {justice.courtName}, {justice.fileReference}
            </span>
          ) : null}
        </div>
      </div>

      <Separator />
    </div>
  );
}
