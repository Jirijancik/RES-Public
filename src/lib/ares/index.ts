// Types
export type {
  AresHeadquarters,
  AresStatisticalData,
  AresDeliveryAddress,
  AresRegistrationStatuses,
  AresBusinessRecord,
  AresEconomicSubject,
  AresSearchResult,
  AresSearchParams,
} from "./ares.types";

// Constants
export {
  ARES_BASE_URL,
  ARES_DEFAULT_PAGE_SIZE,
  ARES_MAX_PAGE_SIZE,
  ARES_REQUEST_TIMEOUT,
  REGION_CODES,
  DISTRICT_CODES,
} from "./ares.constants";

// Query Keys
export { aresKeys } from "./ares.keys";

// Endpoints
export { aresEndpoints, AresApiError } from "./ares.endpoints";

// React Query Hooks
export { useAresSubjectByIco, useAresSubjectByIcoSuspense } from "./ares.queries";
export { useAresSearch, useAresSearchMutation } from "./ares.mutations";
