import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { justiceKeys } from "./justice.keys";
import { justiceEndpoints, type JusticeApiError } from "./justice.endpoints";
import type {
  JusticeEntityDetail,
  JusticeHistoryEntry,
  JusticePersonWithFact,
  JusticeAddress,
  JusticeDocumentList,
} from "./justice.types";

type GetByIcoOptions = Omit<
  UseQueryOptions<
    JusticeEntityDetail,
    JusticeApiError,
    JusticeEntityDetail,
    ReturnType<typeof justiceKeys.detail>
  >,
  "queryKey" | "queryFn"
>;

/**
 * Hook to fetch Justice entity by ICO
 * Uses GET /justice/entities/?ico={ico}
 */
export function useJusticeEntityByIco(ico: string, options?: GetByIcoOptions) {
  return useQuery({
    queryKey: justiceKeys.detail(ico),
    queryFn: () => justiceEndpoints.getByIco(ico),
    enabled: Boolean(ico) && ico.length >= 1,
    ...options,
  });
}

/**
 * Hook to fetch entity change history
 */
export function useJusticeHistory(ico: string) {
  return useQuery({
    queryKey: justiceKeys.history(ico),
    queryFn: () => justiceEndpoints.getHistory(ico),
    enabled: Boolean(ico) && ico.length >= 1,
  });
}

/**
 * Hook to fetch entity persons
 */
export function useJusticePersons(ico: string) {
  return useQuery({
    queryKey: justiceKeys.persons(ico),
    queryFn: () => justiceEndpoints.getPersons(ico),
    enabled: Boolean(ico) && ico.length >= 1,
  });
}

/**
 * Hook to fetch entity addresses
 */
export function useJusticeAddresses(ico: string) {
  return useQuery({
    queryKey: justiceKeys.addresses(ico),
    queryFn: () => justiceEndpoints.getAddresses(ico),
    enabled: Boolean(ico) && ico.length >= 1,
  });
}

/**
 * Hook to fetch sbírka listin documents.
 * Disabled by default — enable by setting `enabled: true` when the user clicks.
 */
export function useJusticeDocuments(ico: string, enabled: boolean = false) {
  return useQuery({
    queryKey: justiceKeys.documents(ico),
    queryFn: () => justiceEndpoints.getDocuments(ico),
    enabled: enabled && Boolean(ico) && ico.length >= 1,
  });
}
