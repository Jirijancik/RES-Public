"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDownIcon, FileTextIcon, DownloadIcon } from "lucide-react";
import { JusticeFinancialTable } from "./justice-financial-table";
import type { JusticeDocument } from "@/lib/justice";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface JusticeDocumentCardProps {
  document: JusticeDocument;
  showPdfPreviews: boolean;
}

export function JusticeDocumentCard({ document: doc, showPdfPreviews }: JusticeDocumentCardProps) {
  const { t } = useTranslation("forms");
  const [isOpen, setIsOpen] = useState(!!doc.financialData);

  const pdfFiles = doc.files.filter((f) => f.isPdf);
  const previewFiles = showPdfPreviews ? pdfFiles.slice(0, 3) : [];
  const linkFiles = showPdfPreviews ? pdfFiles.slice(3) : pdfFiles;

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileTextIcon aria-hidden="true" className="text-muted-foreground size-4" />
                <CardTitle className="text-base">{doc.documentType || doc.documentNumber}</CardTitle>
              </div>
              <ChevronDownIcon
                aria-hidden="true"
                className={`text-muted-foreground size-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </div>
            {doc.documentNumber && doc.documentType && (
              <div className="text-muted-foreground text-xs">{doc.documentNumber}</div>
            )}
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Financial data from XML */}
            {doc.financialData && (
              <JusticeFinancialTable data={doc.financialData} />
            )}

            {/* PDF iframe previews (only for non-XML documents) */}
            {!doc.financialData && previewFiles.length > 0 && (
              <div className="space-y-4">
                {previewFiles.map((file) => (
                  <div key={file.downloadId} className="space-y-1">
                    <div className="text-muted-foreground text-xs">{file.filename}</div>
                    <iframe
                      src={`${API_BASE}/justice/documents/${file.downloadId}/`}
                      className="h-[600px] w-full rounded-md border"
                      title={file.filename}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Download links for remaining files */}
            {(linkFiles.length > 0 || doc.files.some((f) => f.isXml)) && (
              <div className="space-y-1">
                <div className="text-muted-foreground text-xs font-medium">
                  {t("justice.documents.files")}
                </div>
                {doc.files
                  .filter((f) => !previewFiles.includes(f))
                  .map((file) => (
                    <a
                      key={file.downloadId}
                      href={`${API_BASE}/justice/documents/${file.downloadId}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1.5 text-sm"
                    >
                      <DownloadIcon aria-hidden="true" className="size-3" />
                      {file.filename}
                      {file.sizeKb != null && (
                        <span className="text-muted-foreground">({file.sizeKb} kB)</span>
                      )}
                    </a>
                  ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
