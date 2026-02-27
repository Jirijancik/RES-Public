"use client";

import { useTranslation } from "react-i18next";
import type { JusticeFinancialData, JusticeFinancialRow } from "@/lib/justice";

interface JusticeFinancialTableProps {
  data: JusticeFinancialData;
}

function formatAmount(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat("cs-CZ").format(value);
}

function FinancialRows({
  rows,
  hasBrutto,
}: {
  rows: JusticeFinancialRow[];
  hasBrutto: boolean;
}) {
  const { t } = useTranslation("forms");

  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4 font-medium">{t("justice.documents.financials.item")}</th>
            {hasBrutto ? (
              <>
                <th className="whitespace-nowrap py-2 px-2 text-right font-medium">
                  {t("justice.documents.financials.brutto")}
                </th>
                <th className="whitespace-nowrap py-2 px-2 text-right font-medium">
                  {t("justice.documents.financials.korekce")}
                </th>
                <th className="whitespace-nowrap py-2 px-2 text-right font-medium">
                  {t("justice.documents.financials.netto")}
                </th>
                <th className="whitespace-nowrap py-2 px-2 text-right font-medium">
                  {t("justice.documents.financials.nettoMin")}
                </th>
              </>
            ) : (
              <>
                <th className="whitespace-nowrap py-2 px-2 text-right font-medium">
                  {t("justice.documents.financials.current")}
                </th>
                <th className="whitespace-nowrap py-2 px-2 text-right font-medium">
                  {t("justice.documents.financials.previous")}
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSummary = row.label.startsWith("*");
            return (
              <tr
                key={row.row}
                className={`border-b last:border-0 ${isSummary ? "bg-muted/30 font-semibold" : ""}`}
              >
                <td className="py-1.5 pr-4">{row.label || `Řádek ${row.row}`}</td>
                {hasBrutto ? (
                  <>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                      {formatAmount(row.brutto)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                      {formatAmount(row.korekce)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                      {formatAmount(row.netto)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                      {formatAmount(row.nettoMin)}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                      {formatAmount(row.current)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                      {formatAmount(row.previous)}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function JusticeFinancialTable({ data }: JusticeFinancialTableProps) {
  const { t } = useTranslation("forms");

  return (
    <div className="space-y-6">
      <div className="text-muted-foreground text-xs">
        {t("justice.documents.financials.period", {
          from: data.metadata.periodFrom,
          to: data.metadata.periodTo,
        })}{" "}
        ({data.metadata.currency}, {t("justice.documents.financials.inThousands")})
      </div>

      {data.aktiva.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">
            {t("justice.documents.financials.aktiva")}
          </h4>
          <FinancialRows rows={data.aktiva} hasBrutto={true} />
        </div>
      )}

      {data.pasiva.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">
            {t("justice.documents.financials.pasiva")}
          </h4>
          <FinancialRows rows={data.pasiva} hasBrutto={false} />
        </div>
      )}

      {data.vzz.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">
            {t("justice.documents.financials.vzz")}
          </h4>
          <FinancialRows rows={data.vzz} hasBrutto={false} />
        </div>
      )}
    </div>
  );
}
