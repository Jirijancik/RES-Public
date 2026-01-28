import { useQuery, useSuspenseQuery, type UseQueryOptions } from "@tanstack/react-query";
import { aresKeys } from "./ares.keys";
import { aresEndpoints, type AresApiError } from "./ares.endpoints";
import type { AresEconomicSubject } from "./ares.types";

type GetByIcoOptions = Omit<
  UseQueryOptions<
    AresEconomicSubject,
    AresApiError,
    AresEconomicSubject,
    ReturnType<typeof aresKeys.detail>
  >,
  "queryKey" | "queryFn"
>;

/**
 * Hook to fetch economic subject by ICO
 * Uses GET /{ico} endpoint
 */
export function useAresSubjectByIco(ico: string, options?: GetByIcoOptions) {
  return useQuery({
    queryKey: aresKeys.detail(ico),
    queryFn: () => aresEndpoints.getByIco(ico),
    enabled: Boolean(ico) && ico.length >= 1,
    ...options,
  });
}

/**
 * Suspense-enabled hook to fetch economic subject by ICO
 * Use inside a Suspense boundary
 */
export function useAresSubjectByIcoSuspense(ico: string) {
  return useSuspenseQuery({
    queryKey: aresKeys.detail(ico),
    queryFn: () => aresEndpoints.getByIco(ico),
  });
}
