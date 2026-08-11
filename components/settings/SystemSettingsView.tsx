"use client";

import Link from "next/link";
import {
  Bell,
  FileText,
  Home,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Wallet,
} from "lucide-react";

const sections = [
  {
    title: "Финансовые настройки",
    description: "Комиссии, тарифы доставки и параметры выплат.",
    href: "/layout-20/analytics",
    icon: Wallet,
  },
  {
    title: "Шаблоны уведомлений",
    description: "Системные тексты и массовые рассылки.",
    href: "/layout-20/notifications",
    icon: Bell,
  },
  {
    title: "Главная клиентского приложения",
    description: "Промо-блоки, категории и подборки товаров.",
    href: "/layout-20/content/home",
    icon: Home,
  },
  {
    title: "Администраторы и роли",
    description: "Доступ сотрудников к разделам админ-панели.",
    href: "/layout-20/admins",
    icon: ShieldCheck,
  },
  {
    title: "Промокоды",
    description: "Скидки, лимиты использования и условия акций.",
    href: "/layout-20/promocodes",
    icon: ReceiptText,
  },
  {
    title: "Журнал действий",
    description: "Проверка изменений системных настроек и действий администраторов.",
    href: "/layout-20/audit",
    icon: FileText,
  },
];

export default function SystemSettingsView() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-950 text-white">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Настройки</h1>
              <p className="mt-1 text-sm text-slate-500">
                Только реальные системные настройки. Неработающих переключателей здесь нет.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.href}
                href={section.href}
                className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{section.title}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-500">{section.description}</div>
                    <div className="mt-4 text-sm font-semibold text-slate-900">Открыть →</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
