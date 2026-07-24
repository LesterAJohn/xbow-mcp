const DEFAULT_BASE_URL = "https://console.xbow.com/api/v1";
const DEFAULT_API_VERSION = "2026-07-01";

export class XbowApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "XbowApiError";
    this.status = details.status;
    this.code = details.code;
    this.error = details.error;
    this.details = details.details;
    this.url = details.url;
    this.method = details.method;
  }
}

function normalizeBaseUrl(baseUrl) {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function normalizePath(path) {
  return path.replace(/^\/?api\/v1\/?/, "").replace(/^\//, "");
}

function buildUrl(baseUrl, path, query = {}) {
  const url = new URL(normalizePath(path), normalizeBaseUrl(baseUrl));
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url;
}

function isRetriableStatus(status) {
  return status === 429 || status >= 500;
}

async function defaultSleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function readResponseBody(response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (response.status === 204) {
    return null;
  }

  if (contentType.includes("application/json")) {
    return await response.json();
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function serializeBody(body) {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (typeof body === "string" || body instanceof Uint8Array || body instanceof ArrayBuffer || body instanceof FormData) {
    return body;
  }

  return JSON.stringify(body);
}

function toErrorMessage(payload, response) {
  if (payload && typeof payload === "object") {
    const error = payload.error ?? response.statusText ?? "XBOW API error";
    const message = payload.message ? `${error}: ${payload.message}` : error;
    return { message, code: payload.code, error, details: payload };
  }

  const fallback = response.statusText || "XBOW API error";
  return { message: `${response.status} ${fallback}`.trim(), code: undefined, error: fallback, details: payload };
}

export function createXbowClient({
  apiToken,
  apiVersion = DEFAULT_API_VERSION,
  baseUrl = DEFAULT_BASE_URL,
  fetchImpl = globalThis.fetch,
  retryAttempts = 3,
  retryDelayMs = 250,
  sleep = defaultSleep,
} = {}) {
  if (!apiToken) {
    throw new Error("XBOW_API_TOKEN is required");
  }

  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required");
  }

  async function request(path, options = {}) {
    const {
      method = "GET",
      query = {},
      body,
      headers = {},
    } = options;

    const url = buildUrl(baseUrl, path, query);
    let attempt = 0;

    while (true) {
      const requestHeaders = new Headers(headers);
      requestHeaders.set("Authorization", `Bearer ${apiToken}`);
      requestHeaders.set("X-XBOW-API-Version", apiVersion);

      const serializedBody = serializeBody(body);
      if (serializedBody !== undefined && !requestHeaders.has("content-type")) {
        requestHeaders.set("Content-Type", "application/json");
      }

      const response = await fetchImpl(url, {
        method,
        headers: requestHeaders,
        body: serializedBody,
      });

      const payload = await readResponseBody(response);

      if (response.ok) {
        return payload;
      }

      if (isRetriableStatus(response.status) && attempt < retryAttempts) {
        attempt += 1;
        await sleep(retryDelayMs * 2 ** (attempt - 1));
        continue;
      }

      const errorInfo = toErrorMessage(payload, response);
      throw new XbowApiError(errorInfo.message, {
        status: response.status,
        code: errorInfo.code,
        error: errorInfo.error,
        details: errorInfo.details,
        url: url.toString(),
        method,
      });
    }
  }

  return {
    request,
  };
}

export function defaultXbowClientConfigFromEnv(env = process.env) {
  return {
    apiToken: env.XBOW_API_TOKEN,
    apiVersion: env.XBOW_API_VERSION ?? DEFAULT_API_VERSION,
    baseUrl: env.XBOW_API_BASE_URL ?? DEFAULT_BASE_URL,
  };
}
