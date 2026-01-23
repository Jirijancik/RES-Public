// Server side docs:
// https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

const VERIFY_ENDPOINT_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFICATION_TIMEOUT_MS = 10000; // 10 second timeout

export type TurnstileResponse = {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
  action?: string;
  cdata?: string;
};

export type TurnstileVerificationResult = {
  success: boolean;
  error?: string;
  hostname?: string;
  errorCodes?: string[];
};

export async function verifyTurnstileToken(
  token: string,
  remoteip?: string
): Promise<TurnstileVerificationResult> {
  try {
    const secret = process.env.TURNSTILE_SECRET_KEY;

    if (!secret) {
      return {
        success: false,
        error: "Server configuration error - missing Turnstile secret key.",
      };
    }

    if (!token) {
      return {
        success: false,
        error: "Missing Turnstile verification.",
      };
    }

    // Validate token length (max 2048 characters per Cloudflare docs)
    if (token.length > 2048) {
      return {
        success: false,
        error: "Invalid token format.",
      };
    }

    // Prepare form data
    const params = new URLSearchParams({
      secret,
      response: token,
    });

    if (remoteip) {
      params.append("remoteip", remoteip);
    }

    // Make request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VERIFICATION_TIMEOUT_MS);

    try {
      const response = await fetch(VERIFY_ENDPOINT_URL, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data: TurnstileResponse = await response.json();

      if (!data.success) {
        const errorCodes = data["error-codes"] || [];
        const userFriendlyMessage = getErrorMessage(errorCodes);

        console.error("Turnstile verification failed:", { errorCodes, hostname: data.hostname });

        return {
          success: false,
          error: userFriendlyMessage,
          errorCodes,
        };
      }

      return {
        success: true,
        hostname: data.hostname,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("Turnstile verification timeout");
      return {
        success: false,
        error: "Verification timeout. Please try again.",
      };
    }

    console.error("Turnstile verification error:", error);
    return {
      success: false,
      error: "An error occurred during verification. Please try again.",
    };
  }
}

function getErrorMessage(errorCodes: string[]): string {
  if (errorCodes.includes("timeout-or-duplicate")) {
    return "Verification expired or already used. Please try again.";
  }
  if (errorCodes.includes("invalid-input-response")) {
    return "Invalid verification. Please refresh and try again.";
  }
  if (errorCodes.includes("invalid-input-secret")) {
    return "Server configuration error. Please contact support.";
  }
  if (errorCodes.includes("missing-input-response")) {
    return "Missing verification. Please complete the challenge.";
  }
  if (errorCodes.includes("missing-input-secret")) {
    return "Server configuration error. Please contact support.";
  }
  if (errorCodes.includes("bad-request")) {
    return "Invalid request. Please try again.";
  }
  if (errorCodes.includes("internal-error")) {
    return "Verification service temporarily unavailable. Please try again.";
  }

  return "Verification failed. Please try again.";
}

export function getClientIP(request: Request): string | undefined {
  const cfConnectingIP = request.headers.get("CF-Connecting-IP");
  const xForwardedFor = request.headers.get("X-Forwarded-For");
  const xRealIP = request.headers.get("X-Real-IP");

  return (
    cfConnectingIP ||
    (xForwardedFor ? xForwardedFor.split(",")[0].trim() : undefined) ||
    xRealIP ||
    undefined
  );
}
