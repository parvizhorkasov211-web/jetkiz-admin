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
  let rawMessage = "";

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;

    const message = record.message;
    if (Array.isArray(message)) {
      rawMessage = message.join("; ");
    }

    if (!rawMessage && typeof message === "string" && message.trim()) {
      rawMessage = message;
    }

    if (!rawMessage && message && typeof message === "object") {
      const nestedMessage = (message as Record<string, unknown>).message;
      if (typeof nestedMessage === "string" && nestedMessage.trim()) {
        rawMessage = nestedMessage;
      }
    }

    const error = record.error;
    if (!rawMessage && typeof error === "string" && error.trim()) {
      rawMessage = error;
    }

    const raw = record.raw;
    if (!rawMessage && typeof raw === "string" && raw.trim()) {
      rawMessage = raw;
    }
  }

  if (!rawMessage && typeof data === "string" && data.trim()) {
    rawMessage = data;
  }

  const normalized = rawMessage.trim().toLowerCase();
  const exactRu: Record<string, string> = {
    "database request failed":
      "Не удалось получить данные из базы. Проверьте миграции backend.",
    forbidden: "Недостаточно прав для выполнения этого действия.",
    unauthorized: "Сессия истекла. Войдите в админку заново.",
    "order not found": "Заказ не найден.",
    "courier not found": "Курьер не найден.",
    "courier is not assigned": "Курьер ещё не назначен.",
  };

  if (exactRu[normalized]) return exactRu[normalized];
  const exact: Record<string, string> = {
    "database request failed": "Не удалось получить данные из базы. Проверьте миграции backend.",
    forbidden: "Недостаточно прав для выполнения этого действия.",
    unauthorized: "Сессия истекла. Войдите в админку заново.",
    "order not found": "Заказ не найден.",
    "courier not found": "Курьер не найден.",
    "courier is not assigned": "Курьер ещё не назначен.",
  };

  if (exact[normalized]) return exact[normalized];
  if (rawMessage) return rawMessage;
  if (status === 400) return "Backend отклонил запрос. Проверьте введённые данные.";
  if (status === 401) return "Сессия истекла. Войдите в админку заново.";
  if (status === 403) return "Недостаточно прав для выполнения этого действия.";
  if (status === 404) return "Запрошенные данные не найдены.";
  if (status === 409) {
    return "Действие конфликтует с текущим состоянием данных. Обновите страницу.";
  }
  if (status >= 500) {
    return "Ошибка backend. Повторите попытку или проверьте журнал сервера.";
  }
  if (status === 400) return "Backend отклонил запрос. Проверьте введённые данные.";
  if (status === 401) return "Сессия истекла. Войдите в админку заново.";
  if (status === 403) return "Недостаточно прав для выполнения этого действия.";
  if (status === 404) return "Запрошенные данные не найдены.";
  if (status === 409) return "Действие конфликтует с текущим состоянием данных. Обновите страницу.";
  if (status >= 500) return "Ошибка backend. Повторите попытку или проверьте журнал сервера.";

  return rawMessage || `Ошибка запроса (${status})`;
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

    throw new Error("Нет связи с backend. Проверьте, что сервер запущен.");
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
