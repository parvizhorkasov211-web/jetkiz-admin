"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Phone } from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone]);

  const isSubmitDisabled = useMemo(() => {
    return loading || normalizedPhone.length < 10 || password.trim().length === 0;
  }, [loading, normalizedPhone, password]);

  const onLogin = useCallback(async () => {
    if (isSubmitDisabled) return;

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
          phone: normalizedPhone,
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
  }, [isSubmitDisabled, normalizedPhone, password]);

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await onLogin();
    },
    [onLogin],
  );

  return (
    <main
      className="relative isolate flex min-h-screen w-screen max-w-none items-center justify-center overflow-hidden bg-[#f7fff8] px-5 py-8 text-emerald-950"
      style={{ width: "100vw", maxWidth: "100vw" }}
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(16,185,129,0.16),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(132,204,22,0.12),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f2fff5_52%,#f7fff8_100%)]" />
      <div className="absolute left-1/2 top-1/2 -z-10 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300/20 blur-3xl" />

      <Link
        href="/promo"
        className="fixed left-5 top-5 z-20 inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/80 px-4 py-2 text-sm font-bold text-emerald-950/60 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white hover:text-emerald-700 sm:left-8 sm:top-8"
      >
        <ArrowLeft className="h-4 w-4" />
        На сайт
      </Link>

      <form
        onSubmit={onSubmit}
        className="w-full max-w-[430px] rounded-[36px] border border-emerald-950/10 bg-white/90 p-6 shadow-[0_32px_120px_rgba(6,95,70,0.14)] backdrop-blur-2xl sm:p-8"
        noValidate
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-600 text-lg font-black text-white shadow-xl shadow-emerald-700/25">
            J
          </div>

          <p className="text-sm font-black uppercase tracking-[0.26em] text-emerald-700">
            JETKIZ
          </p>

          <h1 className="mt-3 text-5xl font-black tracking-[-0.06em] text-emerald-950">
            Вход
          </h1>
        </div>

        <div className="space-y-5">
          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-black text-emerald-950/75"
            >
              Телефон
            </label>

            <div className="relative">
              <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-700/55" />
              <input
                id="phone"
                name="phone"
                className="h-14 w-full rounded-2xl border border-emerald-950/10 bg-emerald-50/60 pl-12 pr-4 text-base font-bold text-emerald-950 outline-none transition placeholder:text-emerald-950/30 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                inputMode="tel"
                autoComplete="username"
                placeholder="+7 708 681 06 93"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={loading}
                aria-invalid={message ? true : false}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-black text-emerald-950/75"
            >
              Пароль
            </label>

            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-700/55" />
              <input
                id="password"
                name="password"
                className="h-14 w-full rounded-2xl border border-emerald-950/10 bg-emerald-50/60 pl-12 pr-12 text-base font-bold text-emerald-950 outline-none transition placeholder:text-emerald-950/30 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Введите пароль"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
                aria-invalid={message ? true : false}
              />

              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-emerald-800/55 transition hover:bg-emerald-100 hover:text-emerald-800"
                disabled={loading}
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {message ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
            >
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            className="group flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 text-base font-black text-white shadow-xl shadow-emerald-700/20 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
            disabled={isSubmitDisabled}
          >
            {loading ? "Входим..." : "Войти"}
            {!loading ? (
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
            ) : null}
          </button>
        </div>
      </form>
    </main>
  );
}