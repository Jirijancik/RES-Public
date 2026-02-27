"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircleIcon, FileArchiveIcon } from "lucide-react";
import { useJusticeDocuments } from "@/lib/justice";
import { JusticeDocumentCard } from "./justice-document-card";

interface JusticeDocumentsSectionProps {
  ico: string;
}

export function JusticeDocumentsSection({ ico }: JusticeDocumentsSectionProps) {
  const { t } = useTranslation("forms");
  const [enabled, setEnabled] = useState(false);
  const { data, isLoading, isError, error } = useJusticeDocuments(ico, enabled);

  if (!enabled) {
    return (
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <FileArchiveIcon aria-hidden="true" className="text-muted-foreground size-5" />
          <span className="font-medium">{t("justice.documents.title")}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEnabled(true)}>
          {t("justice.documents.load")}
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border p-4">
        <Spinner />
        <span className="text-muted-foreground text-sm">{t("justice.documents.loading")}</span>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon aria-hidden="true" className="size-4" />
        <AlertTitle>{t("justice.documents.error")}</AlertTitle>
        <AlertDescription>
          {error?.message}
          <a
            href={`https://or.justice.cz/ias/ui/rejstrik-$firma?ico=${ico}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 underline"
          >
            {t("justice.documents.viewOnJustice")}
          </a>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data || data.documents.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border p-4 text-center text-sm">
        {t("justice.documents.noDocuments")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <FileArchiveIcon aria-hidden="true" className="size-5" />
          {t("justice.documents.title")}
        </h3>
        <span className="text-muted-foreground text-sm">
          {t("justice.documents.count", { count: data.documents.length })}
        </span>
      </div>
      <div className="space-y-3">
        {data.documents.map((doc) => (
          <JusticeDocumentCard
            key={doc.documentId}
            document={doc}
            showPdfPreviews={!doc.financialData}
          />
        ))}
      </div>
    </div>
  );
}
