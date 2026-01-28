import { useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import { aresKeys } from "./ares.keys";
import { aresEndpoints, type AresApiError } from "./ares.endpoints";
import type { AresSearchParams, AresSearchResult } from "./ares.types";

type SearchMutationOptions = Omit<
  UseMutationOptions<AresSearchResult, AresApiError, AresSearchParams>,
  "mutationFn"
>;

/**
 * Mutation hook for searching economic subjects
 * Uses POST /vyhledat endpoint
 */
export function useAresSearch(options?: SearchMutationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: AresSearchParams) => aresEndpoints.search(params),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(aresKeys.search(variables), data);

      data.economicSubjects.forEach((subject) => {
        queryClient.setQueryData(aresKeys.detail(subject.icoId), subject);
      });
    },
    ...options,
  });
}

/**
 * Helper hook that combines search with caching as a query
 */
export function useAresSearchWithCache(options?: SearchMutationOptions) {
  console.log("🚀 ~ useAresSearchWithCache ~ options:", options)
  const mutation = useAresSearch(options);

  return {
    search: mutation.mutate,
    searchAsync: mutation.mutateAsync,
    data: mutation.data,
    error: mutation.error,
    isPending: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}
