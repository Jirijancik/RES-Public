import type { AxiosError } from "axios";
import { apiClient } from "@/lib/api/client";
import type {
  AresSearchParams,
  AresSearchResult,
  AresEconomicSubject,
} from "./ares.types";

/**
 * Custom error class for ARES API errors
 */
export class AresApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "AresApiError";
  }
}

/**
 * Map axios errors to AresApiError
 */
function handleApiError(error: AxiosError): never {
  if (error.response) {
    const { status } = error.response;
    let message = "ARES API error";

    if (status === 400) {
      message = "Invalid request parameters";
    } else if (status === 404) {
      message = "Economic subject not found";
    } else if (status === 429) {
      message = "Too many requests. Please try again later.";
    } else if (status >= 500) {
      message = "ARES service is temporarily unavailable";
    }

    throw new AresApiError(message, status, error);
  } else if (error.request) {
    throw new AresApiError("Unable to connect to ARES service", undefined, error);
  } else {
    throw new AresApiError("Failed to make request to ARES", undefined, error);
  }
}

/**
 * ARES API Endpoints — calls Django backend which proxies ARES
 */
export const aresEndpoints = {
  /**
   * Search for economic subjects
   * POST /ares/search/
   */
  async search(params: AresSearchParams): Promise<AresSearchResult> {
    try {
      const response = await apiClient.post<AresSearchResult>("/ares/search/", params);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Get economic subject by ICO (Company ID)
   * GET /ares/subjects/{ico}/
   */
  async getByIco(ico: string): Promise<AresEconomicSubject> {
    const normalizedIco = ico.padStart(8, "0");
    if (!/^\d{8}$/.test(normalizedIco)) {
      throw new AresApiError("Invalid ICO format. ICO must be 8 digits.");
    }

    try {
      const response = await apiClient.get<AresEconomicSubject>(`/ares/subjects/${normalizedIco}/`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },
};
