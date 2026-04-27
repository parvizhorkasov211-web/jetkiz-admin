const API_PROXY_PREFIX = "/api/proxy";

function normalizePath(path: string) {
  const value = String(path || "").trim();

  if (!value) {
    throw new Error("API path is required");
  }

  if (value.startsWith(API_PROXY_PREFIX)) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${API_PROXY_PREFIX}${value}`;
  }

  return `${API_PROXY_PREFIX}/${value}`;
}

/**
 * ВАЖНО:
 * На frontend нельзя использовать прямой backend URL для admin-запросов.
 * Все admin API должны идти через Next proxy, чтобы HttpOnly cookies дошли до backend.
 */
export const API_URL = API_PROXY_PREFIX;

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function getErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;

    const message = record.message;
    if (Array.isArray(message)) {
      return message.join("; ");
    }

    if (typeof message === "string" && message.trim()) {
      return message;
    }

    const error = record.error;
    if (typeof error === "string" && error.trim()) {
      return error;
    }

    const raw = record.raw;
    if (typeof raw === "string" && raw.trim()) {
      return raw;
    }
  }

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  return `HTTP ${status}`;
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers || {});

  if (init.body && !headers.has("Content-Type") && !isFormData(init.body)) {
    headers.set("Content-Type", "application/json");
  }

  const url = normalizePath(path);

  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch (error) {
    console.error(
      "API network error:",
      url,
      error instanceof Error ? error.message : error,
    );

    throw new Error("API connection failed");
  }

  const text = await response.text();
  const data = text ? safeJson(text) : null;

  if (!response.ok) {
    const error = new Error(getErrorMessage(data, response.status));
    (error as Error & { status?: number; payload?: unknown }).status = response.status;
    (error as Error & { status?: number; payload?: unknown }).payload = data;
    throw error;
  }

  return data as T;
}