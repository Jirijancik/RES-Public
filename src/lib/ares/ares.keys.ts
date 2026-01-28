import type { AresSearchParams } from "./ares.types";

/**
 * Query key factory for ARES queries
 */
export const aresKeys = {
  /** Base key for all ARES queries */
  all: ["ares"] as const,

  /** Key for search queries */
  searches: () => [...aresKeys.all, "search"] as const,

  /** Key for specific search with parameters */
  search: (params: AresSearchParams) => [...aresKeys.searches(), params] as const,

  /** Key for detail queries (by ICO) */
  details: () => [...aresKeys.all, "detail"] as const,

  /** Key for specific ICO detail */
  detail: (ico: string) => [...aresKeys.details(), ico] as const,
};
