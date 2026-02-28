import type { CompanySearchParams } from "./company.types";

/**
 * Query key factory for Company queries
 */
export const companyKeys = {
  /** Base key for all Company queries */
  all: ["company"] as const,

  /** Key for detail queries (by ICO) */
  details: () => [...companyKeys.all, "detail"] as const,

  /** Key for specific ICO detail */
  detail: (ico: string) => [...companyKeys.details(), ico] as const,

  /** Key for search queries */
  searches: () => [...companyKeys.all, "search"] as const,

  /** Key for specific search with parameters */
  search: (params: CompanySearchParams) => [...companyKeys.searches(), params] as const,
};
