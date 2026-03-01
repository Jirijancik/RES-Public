"use client";

import { useTranslation } from "react-i18next";
import { CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface SourceFooterProps {
  source: string;
  updatedAt?: string;
  note?: string;
}

/** Subtle data source attribution footer for information cards */
export function SourceFooter({ source, updatedAt, note }: SourceFooterProps) {
  const { t } = useTranslation("forms");

  return (
    <>
      <Separator />
      <CardFooter>
        <div className="text-muted-foreground text-xs">
          <span>{t("company.common.source")}: {source}</span>
          {updatedAt ? <span className="ml-2">· {t("company.common.updatedAt")} {updatedAt}</span> : null}
          {note ? <div className="mt-0.5">{note}</div> : null}
        </div>
      </CardFooter>
    </>
  );
}
