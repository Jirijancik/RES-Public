import type { AxiosError } from "axios";
import { apiClient } from "@/lib/api/client";
import type { CompanyDetail, CompanySearchResult, CompanySearchParams } from "./company.types";

/**
 * Custom error class for Company API errors
 */
export class CompanyApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "CompanyApiError";
  }
}

/**
 * Map axios errors to CompanyApiError
 */
function handleApiError(error: AxiosError): never {
  if (error.response) {
    const { status } = error.response;
    let message = "Company API error";

    if (status === 400) {
      message = "Invalid request parameters";
    } else if (status === 404) {
      message = "Company not found";
    } else if (status === 429) {
      message = "Too many requests. Please try again later.";
    } else if (status >= 500) {
      message = "Company service is temporarily unavailable";
    }

    throw new CompanyApiError(message, status, error);
  } else if (error.request) {
    throw new CompanyApiError("Unable to connect to Company service", undefined, error);
  } else {
    throw new CompanyApiError("Failed to make request to Company", undefined, error);
  }
}

/**
 * Company API Endpoints — calls Django backend
 */
export const companyEndpoints = {
  /**
   * Get unified company detail by ICO
   * GET /companies/{ico}/
   */
  async getByIco(ico: string): Promise<CompanyDetail> {
    const normalizedIco = ico.padStart(8, "0");
    if (!/^\d{8}$/.test(normalizedIco)) {
      throw new CompanyApiError("Invalid ICO format. ICO must be 8 digits.");
    }

    try {
      const response = await apiClient.get<CompanyDetail>(`/companies/${normalizedIco}/`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Search companies with multi-parameter filters
   * GET /companies/search/?legalForm=112&regionCode=19&...
   */
  async search(params: CompanySearchParams): Promise<CompanySearchResult> {
    try {
      const response = await apiClient.get<CompanySearchResult>("/companies/search/", {
        params,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },
};
