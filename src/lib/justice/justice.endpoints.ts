import type { AxiosError } from "axios";
import { apiClient } from "@/lib/api/client";
import type {
  JusticeSearchParams,
  JusticeSearchResult,
  JusticeEntityDetail,
  JusticeHistoryEntry,
  JusticePersonWithFact,
  JusticeAddress,
  JusticeDocumentList,
} from "./justice.types";

/**
 * Custom error class for Justice API errors
 */
export class JusticeApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "JusticeApiError";
  }
}

/**
 * Map axios errors to JusticeApiError
 */
function handleApiError(error: AxiosError): never {
  if (error.response) {
    const { status } = error.response;
    let message = "Justice API error";

    if (status === 400) {
      message = "Invalid request parameters";
    } else if (status === 404) {
      message = "Entity not found";
    } else if (status === 429) {
      message = "Too many requests. Please try again later.";
    } else if (status >= 500) {
      message = "Justice service is temporarily unavailable";
    }

    throw new JusticeApiError(message, status, error);
  } else if (error.request) {
    throw new JusticeApiError("Unable to connect to Justice service", undefined, error);
  } else {
    throw new JusticeApiError("Failed to make request to Justice", undefined, error);
  }
}

/**
 * Justice API Endpoints — calls Django backend
 */
export const justiceEndpoints = {
  /**
   * Search entities
   * GET /justice/entities/search/
   */
  async search(params: JusticeSearchParams): Promise<JusticeSearchResult> {
    try {
      const response = await apiClient.get<JusticeSearchResult>("/justice/entities/search/", {
        params,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Get entity detail by ICO
   * GET /justice/entities/?ico={ico}
   */
  async getByIco(ico: string): Promise<JusticeEntityDetail> {
    const normalizedIco = ico.padStart(8, "0");
    if (!/^\d{8}$/.test(normalizedIco)) {
      throw new JusticeApiError("Invalid ICO format. ICO must be 8 digits.");
    }

    try {
      const response = await apiClient.get<JusticeEntityDetail>("/justice/entities/", {
        params: { ico: normalizedIco },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Get entity change history
   * GET /justice/entities/{ico}/history/
   */
  async getHistory(ico: string): Promise<JusticeHistoryEntry[]> {
    try {
      const response = await apiClient.get<JusticeHistoryEntry[]>(
        `/justice/entities/${ico}/history/`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Get entity associated persons
   * GET /justice/entities/{ico}/persons/
   */
  async getPersons(ico: string): Promise<JusticePersonWithFact[]> {
    try {
      const response = await apiClient.get<JusticePersonWithFact[]>(
        `/justice/entities/${ico}/persons/`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Get entity addresses
   * GET /justice/entities/{ico}/addresses/
   */
  async getAddresses(ico: string): Promise<JusticeAddress[]> {
    try {
      const response = await apiClient.get<JusticeAddress[]>(
        `/justice/entities/${ico}/addresses/`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Get sbírka listin documents for an entity
   * GET /justice/entities/{ico}/documents/
   */
  async getDocuments(ico: string): Promise<JusticeDocumentList> {
    try {
      const response = await apiClient.get<JusticeDocumentList>(
        `/justice/entities/${ico}/documents/`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },
};
