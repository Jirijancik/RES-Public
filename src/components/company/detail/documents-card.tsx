"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileArchiveIcon, AlertCircleIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { SourceFooter } from "@/components/company/source-footer";
import { useJusticeDocuments } from "@/lib/justice/justice.queries";
import { JusticeDocumentCard } from "@/components/justice/justice-document-card";

interface DocumentsCardProps {
  ico: string;
}

export function DocumentsCard({ ico }: DocumentsCardProps) {
  const { t } = useTranslation("forms");
  const [enabled, setEnabled] = useState(false);
  const { data, isLoading, isError, error } = useJusticeDocuments(ico, enabled);

  // Idle state — show load button
  if (!enabled) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileArchiveIcon aria-hidden="true" className="text-muted-foreground size-5" />
              <CardTitle>{t("company.cards.documents.title")}</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEnabled(true)}>
              {t("company.cards.documents.loadButton")}
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileArchiveIcon aria-hidden="true" className="text-muted-foreground size-5" />
            <CardTitle>{t("company.cards.documents.title")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Spinner />
            <span className="text-muted-foreground text-sm">
              {t("company.cards.documents.loading")}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileArchiveIcon aria-hidden="true" className="text-muted-foreground size-5" />
            <CardTitle>{t("company.cards.documents.title")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!data || data.documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileArchiveIcon aria-hidden="true" className="text-muted-foreground size-5" />
            <CardTitle>{t("company.cards.documents.title")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("justice.documents.noDocuments")}</p>
        </CardContent>
        <SourceFooter
          source={t("company.cards.documents.source")}
          note={t("company.cards.documents.note")}
        />
      </Card>
    );
  }

  // Loaded state — document list
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileArchiveIcon aria-hidden="true" className="size-5" />
            <CardTitle>{t("company.cards.documents.title")}</CardTitle>
          </div>
          <span className="text-muted-foreground text-sm">
            {t("justice.documents.count", { count: data.documents.length })}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.documents.map((doc) => (
            <JusticeDocumentCard
              key={doc.documentId}
              document={doc}
              showPdfPreviews={!doc.financialData}
            />
          ))}
        </div>
      </CardContent>
      <SourceFooter
        source={t("company.cards.documents.source")}
        note={t("company.cards.documents.note")}
      />
    </Card>
  );
}
