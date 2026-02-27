import type { JusticeSearchParams } from "./justice.types";

/**
 * Query key factory for Justice queries
 */
export const justiceKeys = {
  /** Base key for all Justice queries */
  all: ["justice"] as const,

  /** Key for search queries */
  searches: () => [...justiceKeys.all, "search"] as const,

  /** Key for specific search with parameters */
  search: (params: JusticeSearchParams) => [...justiceKeys.searches(), params] as const,

  /** Key for detail queries (by ICO) */
  details: () => [...justiceKeys.all, "detail"] as const,

  /** Key for specific ICO detail */
  detail: (ico: string) => [...justiceKeys.details(), ico] as const,

  /** Key for entity history */
  history: (ico: string) => [...justiceKeys.all, "history", ico] as const,

  /** Key for entity persons */
  persons: (ico: string) => [...justiceKeys.all, "persons", ico] as const,

  /** Key for entity addresses */
  addresses: (ico: string) => [...justiceKeys.all, "addresses", ico] as const,

  /** Key for entity documents (sbírka listin) */
  documents: (ico: string) => [...justiceKeys.detail(ico), "documents"] as const,
};
