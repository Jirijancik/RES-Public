import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { companyKeys } from "./company.keys";
import { companyEndpoints, type CompanyApiError } from "./company.endpoints";
import type { CompanyDetail, CompanySearchResult, CompanySearchParams } from "./company.types";

type GetByIcoOptions = Omit<
  UseQueryOptions<
    CompanyDetail,
    CompanyApiError,
    CompanyDetail,
    ReturnType<typeof companyKeys.detail>
  >,
  "queryKey" | "queryFn"
>;

/**
 * Hook to fetch unified company detail by ICO
 * Uses GET /companies/{ico}/ endpoint
 */
export function useCompanyByIco(ico: string, options?: GetByIcoOptions) {
  return useQuery({
    queryKey: companyKeys.detail(ico),
    queryFn: () => companyEndpoints.getByIco(ico),
    enabled: Boolean(ico) && ico.length >= 1,
    ...options,
  });
}

type SearchOptions = Omit<
  UseQueryOptions<
    CompanySearchResult,
    CompanyApiError,
    CompanySearchResult,
    ReturnType<typeof companyKeys.search>
  >,
  "queryKey" | "queryFn"
>;

/**
 * Hook to search companies with multi-parameter filters
 * Uses GET /companies/search/ endpoint
 */
export function useCompanySearch(params: CompanySearchParams, options?: SearchOptions) {
  return useQuery({
    queryKey: companyKeys.search(params),
    queryFn: () => companyEndpoints.search(params),
    ...options,
  });
}
