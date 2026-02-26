import { useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import { justiceKeys } from "./justice.keys";
import { justiceEndpoints, type JusticeApiError } from "./justice.endpoints";
import type { JusticeSearchParams, JusticeSearchResult } from "./justice.types";

type SearchMutationOptions = Omit<
  UseMutationOptions<JusticeSearchResult, JusticeApiError, JusticeSearchParams>,
  "mutationFn"
>;

/**
 * Mutation hook for searching Justice entities.
 *
 * When only ICO is provided (no name), uses the direct getByIco endpoint
 * and wraps the result as a JusticeSearchResult. Otherwise, uses the
 * search endpoint which filters by name__icontains.
 */
export function useJusticeSearch(options?: SearchMutationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: JusticeSearchParams): Promise<JusticeSearchResult> => {
      const hasIco = params.ico && params.ico.length === 8;
      const hasName = params.name && params.name.trim().length > 0;

      // ICO-only search: use direct lookup endpoint
      if (hasIco && !hasName) {
        const entity = await justiceEndpoints.getByIco(params.ico!);
        return {
          totalCount: 1,
          offset: 0,
          limit: 1,
          entities: [entity],
        };
      }

      // Name search (with optional filters): use search endpoint
      const { ico: _ico, ...searchParams } = params;
      return justiceEndpoints.search(searchParams);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(justiceKeys.search(variables), data);
    },
    ...options,
  });
}
