"use client";

import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { DetailRow } from "@/components/company/shared";
import { SourceFooter } from "@/components/company/source-footer";
import { formatAddress } from "@/components/subject/utils";
import type { AresBusinessRecord } from "@/lib/ares";

const SubjectMap = dynamic(
  () => import("@/components/subject/subject-map").then((mod) => mod.SubjectMap),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted flex h-62.5 items-center justify-center rounded-lg">
        <Spinner className="size-5" />
      </div>
    ),
  }
);

interface AddressCardProps {
  record: AresBusinessRecord | undefined;
  isLoading: boolean;
}

export function AddressCard({ record, isLoading }: AddressCardProps) {
  const { t } = useTranslation("forms");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("company.cards.address.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-62.5 w-full rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!record) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("company.cards.address.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("company.detail.noData")}</p>
        </CardContent>
      </Card>
    );
  }

  const address = formatAddress(record.headquarters);
  const hq = record.headquarters;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("company.cards.address.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hq ? <SubjectMap headquarters={hq} /> : null}

        {hq ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {address ? (
              <DetailRow label={t("ares.fields.address")}>{address}</DetailRow>
            ) : null}
            {hq.postalCode ? (
              <DetailRow label={t("ares.fields.postalCode")}>{hq.postalCode}</DetailRow>
            ) : null}
            {hq.regionName ? (
              <DetailRow label={t("ares.fields.region")}>{hq.regionName}</DetailRow>
            ) : null}
            {hq.districtName ? (
              <DetailRow label={t("ares.fields.district")}>{hq.districtName}</DetailRow>
            ) : null}
            {hq.countryName ? (
              <DetailRow label={t("ares.fields.country")}>{hq.countryName}</DetailRow>
            ) : null}
          </dl>
        ) : null}

        {/* Delivery Address */}
        {record.deliveryAddress &&
        (record.deliveryAddress.addressLine1 ||
          record.deliveryAddress.addressLine2 ||
          record.deliveryAddress.addressLine3) ? (
          <>
            <h4 className="text-sm font-medium">{t("ares.detail.deliveryAddress")}</h4>
            <div className="space-y-1 text-sm">
              {record.deliveryAddress.addressLine1 ? (
                <p>{record.deliveryAddress.addressLine1}</p>
              ) : null}
              {record.deliveryAddress.addressLine2 ? (
                <p>{record.deliveryAddress.addressLine2}</p>
              ) : null}
              {record.deliveryAddress.addressLine3 ? (
                <p>{record.deliveryAddress.addressLine3}</p>
              ) : null}
            </div>
          </>
        ) : null}
      </CardContent>
      <SourceFooter source={t("company.cards.address.source")} />
    </Card>
  );
}
