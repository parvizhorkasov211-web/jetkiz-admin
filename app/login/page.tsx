"use client";

import { useCallback, useMemo, useState } from "react";

type SessionResponse =
  | { success?: boolean; message?: string }
  | { authenticated?: boolean; message?: string };

const DEFAULT_ERROR_MESSAGE = "Неверный логин или пароль";

function normalizePhone(value: string): string {
  return value.replace(/\D+/g, "");
}

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isSubmitDisabled = useMemo(() => {
    return loading || normalizePhone(phone).length < 10 || password.trim().length === 0;
  }, [loading, phone, password]);

  const onLogin = useCallback(async () => {
    if (isSubmitDisabled) {
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      const response = await fetch("/api/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          phone: normalizePhone(phone),
          password,
        }),
      });

      const data = (await response.json().catch(() => null)) as SessionResponse | null;

      if (!response.ok) {
        throw new Error(data?.message || DEFAULT_ERROR_MESSAGE);
      }

      window.location.replace("/layout-20");
    } catch (error: unknown) {
      const nextMessage =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : DEFAULT_ERROR_MESSAGE;

      setMessage(nextMessage);
    } finally {
      setLoading(false);
    }
  }, [isSubmitDisabled, password, phone]);

  const onSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await onLogin();
    },
    [onLogin],
  );

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4" noValidate>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Вход в Jetkiz Admin</h1>
        <p className="text-sm text-slate-500">Введите номер телефона и пароль администратора.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="phone" className="text-sm font-medium">
          Телефон
        </label>
        <input
          id="phone"
          name="phone"
          className="input w-full"
          inputMode="tel"
          autoComplete="username"
          placeholder="7708..."
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          disabled={loading}
          aria-invalid={message ? true : false}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Пароль
        </label>
        <input
          id="password"
          name="password"
          className="input w-full"
          type="password"
          autoComplete="current-password"
          placeholder="Пароль"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={loading}
          aria-invalid={message ? true : false}
        />
      </div>

      <button type="submit" className="btn btn-primary w-full" disabled={isSubmitDisabled}>
        {loading ? "Входим..." : "Войти"}
      </button>

      {message ? (
        <div role="alert" className="text-sm text-red-600">
          {message}
        </div>
      ) : null}
    </form>
  );
}