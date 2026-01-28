import axios, { type AxiosError, type AxiosInstance } from "axios";
import { ARES_BASE_URL, ARES_REQUEST_TIMEOUT } from "./ares.constants";
import { aresParser } from "./ares.parser";
import type {
  AresApiSearchResponse,
  AresApiGetByIcoResponse,
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
 * Create Axios instance configured for ARES API
 */
function createAresClient(): AxiosInstance {
  const client = axios.create({
    baseURL: ARES_BASE_URL,
    timeout: ARES_REQUEST_TIMEOUT,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response) {
        const {status} = error.response;
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
  );

  return client;
}

const aresClient = createAresClient();

/**
 * ARES API Endpoints
 */
export const aresEndpoints = {
  /**
   * Search for economic subjects
   * POST /vyhledat
   */
  async search(params: AresSearchParams): Promise<AresSearchResult> {
    const requestBody = aresParser.toSearchRequest(params);
    const response = await aresClient.post<AresApiSearchResponse>("/vyhledat", requestBody);
    return aresParser.toSearchResult(response.data);
  },

  /**
   * Get economic subject by ICO (Company ID)
   * GET /{ico}
   */
  async getByIco(ico: string): Promise<AresEconomicSubject> {
    const normalizedIco = ico.padStart(8, "0");
    if (!/^\d{8}$/.test(normalizedIco)) {
      throw new AresApiError("Invalid ICO format. ICO must be 8 digits.");
    }

    const response = await aresClient.get<AresApiGetByIcoResponse>(`/${normalizedIco}`);
    return aresParser.toEconomicSubject(response.data);
  },
};
