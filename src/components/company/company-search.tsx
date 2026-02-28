"use client";

import { useState } from "react";
import { useCompanySearch } from "@/lib/company/company.queries";
import type { CompanySearchParams } from "@/lib/company/company.types";
import { Container } from "@/components/ui/container";
import { Spinner } from "@/components/ui/spinner";
import { Link } from "@/components/ui/link";

export function CompanySearch() {
  const [params, setParams] = useState<CompanySearchParams>({
    status: "active",
    limit: 25,
    offset: 0,
  });

  const { data, isLoading } = useCompanySearch(params);

  return (
    <Container className="space-y-6 py-6">
      <h1 className="text-2xl font-bold">Company Search</h1>

      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <Spinner className="size-8" />
        </div>
      )}

      {data && (
        <div>
          <p className="text-muted-foreground mb-4 text-sm">
            {data.totalCount} companies found
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">ICO</th>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Legal Form</th>
                  <th className="p-2 text-left">Region</th>
                  <th className="p-2 text-left">Employees</th>
                  <th className="p-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.companies.map((c) => (
                  <tr key={c.ico} className="hover:bg-muted/50 border-b">
                    <td className="p-2">
                      <Link href={`/companies/${c.ico}` as "/"} className="font-mono hover:underline">
                        {c.ico}
                      </Link>
                    </td>
                    <td className="p-2">{c.name}</td>
                    <td className="p-2">{c.legalForm}</td>
                    <td className="p-2">{c.regionName}</td>
                    <td className="p-2">{c.employeeCategory}</td>
                    <td className="p-2 text-right">
                      {c.latestRevenue
                        ? Number(c.latestRevenue).toLocaleString("cs-CZ")
                        : "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Container>
  );
}
