import type { JusticeEntitySummary } from "@/lib/justice/justice.types";

export interface CompanySources {
  justice: JusticeEntitySummary | null;
  ares: Record<string, unknown> | null;
}

export interface CompanyDetail {
  ico: string;
  name: string;
  isActive: boolean;
  sources: CompanySources;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySummary {
  ico: string;
  name: string;
  isActive: boolean;
  legalForm: string;
  regionCode: number | null;
  regionName: string;
  employeeCategory: string;
  latestRevenue: string | null;
  nacePrimary: string;
}

export interface CompanySearchResult {
  totalCount: number;
  offset: number;
  limit: number;
  companies: CompanySummary[];
}

export interface CompanySearchParams {
  name?: string;
  legalForm?: string;
  regionCode?: number;
  employeeCategory?: string;
  revenueMin?: number;
  revenueMax?: number;
  nace?: string;
  status?: "active" | "inactive" | "all";
  offset?: number;
  limit?: number;
}
