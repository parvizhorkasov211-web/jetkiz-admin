import { cookies } from "next/headers";

export const ACCESS_COOKIE = "jetkiz_admin_access";
export const REFRESH_COOKIE = "jetkiz_admin_refresh";

const ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const REQUEST_TIMEOUT_MS = 10_000;

function normalizeBaseUrl(raw: string): string {
  const value = String(raw || "").trim();

  if (!value) {
    return "";
  }

  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export const BACKEND_API_URL = normalizeBaseUrl(
  process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3000",
);

function isSecureCookie(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    BACKEND_API_URL.startsWith("https://")
  );
}

function getCookieDomain(): string | undefined {
  const value = String(process.env.ADMIN_COOKIE_DOMAIN || "").trim();
  return value.length > 0 ? value : undefined;
}

function getCookieBaseOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecureCookie(),
    path: "/",
    domain: getCookieDomain(),
  };
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  try {
    const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payloadBase64 + "=".repeat((4 - (payloadBase64.length % 4)) % 4);
    const decoded = Buffer.from(padded, "base64").toString("utf8");
    const parsed = JSON.parse(decoded) as Record<string, unknown>;

    return parsed;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string, skewSeconds = 15): boolean {
  const payload = decodeJwtPayload(token);

  if (!payload) {
    return true;
  }

  const exp = payload.exp;
  if (typeof exp !== "number" || !Number.isFinite(exp)) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return exp <= now + skewSeconds;
}

export async function getSessionTokens(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  const jar = await cookies();

  return {
    accessToken: jar.get(ACCESS_COOKIE)?.value ?? null,
    refreshToken: jar.get(REFRESH_COOKIE)?.value ?? null,
  };
}

export async function setSessionTokens(params: {
  accessToken: string;
  refreshToken: string;
}): Promise<void> {
  const jar = await cookies();
  const baseOptions = getCookieBaseOptions();

  jar.set(ACCESS_COOKIE, params.accessToken, {
    ...baseOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
  });

  jar.set(REFRESH_COOKIE, params.refreshToken, {
    ...baseOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookies(): Promise<void> {
  const jar = await cookies();
  const baseOptions = getCookieBaseOptions();

  jar.set(ACCESS_COOKIE, "", {
    ...baseOptions,
    maxAge: 0,
    expires: new Date(0),
  });

  jar.set(REFRESH_COOKIE, "", {
    ...baseOptions,
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function backendJsonFetch(
  path: string,
  init: RequestInit = {},
): Promise<{
  response: Response;
  data: unknown;
}> {
  const finalPath = path.startsWith("/") ? path : `/${path}`;
  const headers = new Headers(init.headers || {});
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(`${BACKEND_API_URL}${finalPath}`, {
      ...init,
      headers,
      cache: "no-store",
      signal: init.signal ?? controller.signal,
    });

    const text = await response.text();
    let data: unknown = null;

    if (text) {
      try {
        data = JSON.parse(text) as unknown;
      } catch {
        data = { raw: text };
      }
    }

    return { response, data };
  } finally {
    clearTimeout(timeout);
  }
}

export async function refreshAdminSession(): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  const { refreshToken } = await getSessionTokens();

  if (!refreshToken || refreshToken.trim().length === 0) {
    await clearSessionCookies();
    return null;
  }

  const refresh = await backendJsonFetch("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });

  if (!refresh.response.ok || !refresh.data || typeof refresh.data !== "object") {
    await clearSessionCookies();
    return null;
  }

  const accessToken =
    "accessToken" in refresh.data
      ? refresh.data.accessToken
      : "access_token" in refresh.data
        ? refresh.data.access_token
        : null;

  const nextRefreshToken =
    "refreshToken" in refresh.data
      ? refresh.data.refreshToken
      : "refresh_token" in refresh.data
        ? refresh.data.refresh_token
        : refreshToken;

  if (
    typeof accessToken !== "string" ||
    accessToken.trim().length === 0 ||
    typeof nextRefreshToken !== "string" ||
    nextRefreshToken.trim().length === 0
  ) {
    await clearSessionCookies();
    return null;
  }

  await setSessionTokens({
    accessToken,
    refreshToken: nextRefreshToken,
  });

  return {
    accessToken,
    refreshToken: nextRefreshToken,
  };
}

export async function getValidAccessToken(): Promise<string | null> {
  const { accessToken } = await getSessionTokens();

  if (accessToken && !isTokenExpired(accessToken)) {
    return accessToken;
  }

  const refreshed = await refreshAdminSession();
  return refreshed?.accessToken ?? null;
}