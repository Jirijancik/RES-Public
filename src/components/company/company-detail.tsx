"use client";

import { ArrowLeftIcon, AlertCircleIcon } from "lucide-react";
import { useCompanyByIco } from "@/lib/company/company.queries";
import { Container } from "@/components/ui/container";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Link } from "@/components/ui/link";

interface CompanyDetailProps {
  ico: string;
}

function formatDate(date: string | null | undefined): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("cs-CZ").format(parsed);
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

export function CompanyDetail({ ico }: CompanyDetailProps) {
  const { data, isLoading, error } = useCompanyByIco(ico);

  if (isLoading) {
    return (
      <Container className="flex items-center justify-center py-20">
        <Spinner className="size-8" />
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container className="py-10">
        <Alert variant="destructive">
          <AlertCircleIcon className="size-4" />
          <AlertTitle>Company not found.</AlertTitle>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="space-y-6 py-6">
      <div className="flex items-center gap-3">
        <Link href="/companies/search" className="text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <p className="text-muted-foreground text-sm">
            ICO: <span className="font-mono">{data.ico}</span>
            <span className={`ml-3 ${data.isActive ? "text-green-600" : "text-red-500"}`}>
              {data.isActive ? "Active" : "Inactive"}
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Justice section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Justice Registry</CardTitle>
          </CardHeader>
          <CardContent>
            {data.sources.justice ? (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <DetailRow label="Legal Form">{data.sources.justice.legalFormName || "—"}</DetailRow>
                <DetailRow label="Court">{data.sources.justice.courtName || "—"}</DetailRow>
                <DetailRow label="File Ref">{data.sources.justice.fileReference || "—"}</DetailRow>
                <DetailRow label="Registered">{formatDate(data.sources.justice.registrationDate) || "—"}</DetailRow>
                {data.sources.justice.deletionDate && (
                  <DetailRow label="Deleted">{formatDate(data.sources.justice.deletionDate)}</DetailRow>
                )}
              </dl>
            ) : (
              <p className="text-muted-foreground text-sm">No Justice data available.</p>
            )}
          </CardContent>
        </Card>

        {/* ARES section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ARES Registry</CardTitle>
          </CardHeader>
          <CardContent>
            {data.sources.ares ? (
              <p className="text-muted-foreground text-sm">ARES data available. Raw data stored.</p>
            ) : (
              <p className="text-muted-foreground text-sm">No ARES data available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-muted-foreground text-xs">
        Last updated: {formatDate(data.updatedAt) || "—"}
      </p>
    </Container>
  );
}
