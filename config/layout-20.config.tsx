import { MenuConfig } from "@/config/types";
import {
  BarChart3,
  Bell,
  ChevronLeft,
  FileCheck,
  FileText,
  Home,
  MapPin,
  MessageSquare,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  Tag,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

const L20 = "/layout-20";

export const MENU_SIDEBAR_MAIN: MenuConfig = [
  {
    children: [
      {
        title: "Главная",
        path: `${L20}`,
        icon: Home,
      },
    ],
  },
  {
    title: "Операции",
    children: [
      {
        title: "Заказы",
        path: `${L20}/orders`,
        icon: ShoppingBag,
      },
      {
        title: "Курьеры",
        path: `${L20}/couriers`,
        icon: Users,
      },
      {
        title: "Рестораны",
        path: `${L20}/restaurants`,
        icon: UtensilsCrossed,
      },
      {
        title: "Клиенты",
        path: `${L20}/users`,
        icon: Users,
      },
      {
        title: "Карта курьеров",
        path: `${L20}/couriers/map`,
        icon: MapPin,
      },
    ],
  },
  {
    title: "Аналитика",
    children: [
      {
        title: "Метрики курьеров",
        path: `${L20}/couriers/metrics`,
        icon: BarChart3,
      },
      {
        title: "Метрики ресторанов",
        path: `${L20}/restaurant-metrics`,
        icon: TrendingUp,
      },
      {
        title: "Метрики клиентов",
        path: `${L20}/clients/metrics`,
        icon: Users,
      },
      {
        title: "Поиск и избранное",
        path: `${L20}/clients/search-favorites`,
        icon: Search,
      },
      {
        title: "Финансы",
        path: `${L20}/analytics`,
        icon: Wallet,
      },
    ],
  },
  {
    title: "Контент",
    children: [
      {
        title: "Промокоды",
        path: `${L20}/promocodes`,
        icon: Tag,
      },
      {
        title: "Отзывы",
        path: `${L20}/reviews`,
        icon: MessageSquare,
      },
      {
        title: "Уведомления",
        path: `${L20}/notifications`,
        icon: Bell,
      },
      {
        title: "CMS",
        path: `${L20}`,
        icon: FileText,
      },
    ],
  },
  {
    title: "Управление",
    children: [
      {
        title: "Администраторы",
        path: `${L20}/admins`,
        icon: Shield,
      },
      {
        title: "Настройки",
        path: `${L20}/settings`,
        icon: Settings,
      },
      {
        title: "Журнал действий",
        path: `${L20}/audit`,
        icon: FileCheck,
      },
    ],
  },
];

export const MENU_SIDEBAR_WORKSPACES: MenuConfig = [];
export const MENU_SIDEBAR_RESOURCES: MenuConfig = [];

export const MENU_TOOLBAR: MenuConfig = [];

export const SIDEBAR_COLLAPSE_ICON = ChevronLeft;