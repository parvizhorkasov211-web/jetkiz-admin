"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  ImagePlus,
  Loader2,
  Package,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { apiFetch, API_URL } from "@/lib/api";
import ProductsPickerModal from "@/components/home/ProductsPickerModal";

type RuntimeStatus = "OPEN" | "CLOSED";

type HomeCmsCategoryProduct = {
  id?: string;
  productId: string;
  sortOrder: number;
  isActive: boolean;
  product?: {
    id: string;
    titleRu: string;
    titleKk: string;
    price: number;
    imageUrl: string | null;
    isAvailable: boolean;
    restaurantId: string;
    restaurant: {
      id: string;
      nameRu: string;
      nameKk: string;
      runtimeStatus?: RuntimeStatus;
    };
  };
};

type HomeCmsCategory = {
  id?: string;
  clientKey: string;
  titleRu: string;
  titleKk: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
  products: HomeCmsCategoryProduct[];
};

type HomeCmsAdminResponse = {
  id: string;
  promoTitleRu: string;
  promoTitleKk: string;
  promoImageUrl: string;
  promoIsActive: boolean;
  categories: Array<Omit<HomeCmsCategory, "clientKey">>;
  updatedAt?: string | null;
};

type UploadResponse = { url: string };

type SessionResponse = {
  authenticated?: boolean;
  admin?: {
    roleCodes?: string[];
    roles?: string[];
    permissionCodes?: string[];
    permissions?: string[];
  } | null;
};

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
} | null;

const API_BASE = API_URL;
const PAGE_SIZE = 20;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function makeKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function resolveImageUrl(url?: string | null) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}

function normalizeCategories(categories: HomeCmsCategory[]) {
  return categories.map((category, categoryIndex) => ({
    id: category.id,
    titleRu: category.titleRu.trim(),
    titleKk: category.titleKk.trim(),
    imageUrl: category.imageUrl.trim(),
    sortOrder: categoryIndex,
    isActive: category.isActive,
    products: category.products.map((product, productIndex) => ({
      id: product.id,
      productId: product.productId,
      sortOrder: productIndex,
      isActive: product.isActive,
    })),
  }));
}

function serializeDraft(input: {
  promoTitleRu: string;
  promoTitleKk: string;
  promoImageUrl: string;
  promoIsActive: boolean;
  categories: HomeCmsCategory[];
}) {
  return JSON.stringify({
    promoTitleRu: input.promoTitleRu.trim(),
    promoTitleKk: input.promoTitleKk.trim(),
    promoImageUrl: input.promoImageUrl.trim(),
    promoIsActive: input.promoIsActive,
    categories: normalizeCategories(input.categories),
  });
}

function formatUpdatedAt(value: string | null) {
  if (!value) return "Нет данных";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Нет данных";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function validateImage(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Можно загрузить только JPG, PNG или WEBP");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Размер изображения не должен превышать 8 МБ");
  }
}

async function uploadImage(file: File) {
  validateImage(file);
  const formData = new FormData();
  formData.append("file", file);
  const data = await apiFetch<UploadResponse>("/home-cms/upload", {
    method: "POST",
    body: formData,
  });
  if (!data?.url) throw new Error("Сервер не вернул ссылку на изображение");
  return data.url;
}

function CompactStat({ label, value, dot }: { label: string; value: string; dot?: "green" | "gray" }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      {dot ? (
        <span className={`h-2 w-2 shrink-0 rounded-full ${dot === "green" ? "bg-emerald-500" : "bg-slate-300"}`} />
      ) : null}
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className="truncate text-sm font-bold text-slate-900">{value}</span>
    </div>
  );
}

function Field({ label, value, onChange, disabled, placeholder }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
      />
    </label>
  );
}

function Toggle({ checked, onChange, label, disabled }: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className={`inline-flex items-center gap-2 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-emerald-500" : "bg-slate-300"}`}
        aria-pressed={checked}
      >
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${checked ? "left-6" : "left-1"}`} />
      </button>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
    </label>
  );
}

function ImagePicker({ imageUrl, onUploaded, loading, disabled, compact = false }: {
  imageUrl: string;
  onUploaded: (file: File) => Promise<void>;
  loading: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <label className={`relative block overflow-hidden rounded-xl border border-slate-300 bg-slate-100 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-slate-500"}`}>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={disabled || loading}
        onChange={async (event) => {
          const input = event.currentTarget;
          const file = input.files?.[0];
          try {
            if (file) await onUploaded(file);
          } finally {
            input.value = "";
          }
        }}
      />
      <div className={compact ? "h-24" : "h-36"}>
        {imageUrl ? (
          <img src={resolveImageUrl(imageUrl)} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400"><ImagePlus className="h-7 w-7" /></div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-slate-950/70 px-3 py-2 text-xs font-bold text-white backdrop-blur-sm">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          {loading ? "Загрузка..." : imageUrl ? "Заменить фото" : "Загрузить фото"}
        </div>
      </div>
    </label>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white ${className}`}>{children}</section>;
}

export default function HomeCmsEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [canUpdate, setCanUpdate] = useState(false);

  const [promoTitleRu, setPromoTitleRu] = useState("");
  const [promoTitleKk, setPromoTitleKk] = useState("");
  const [promoImageUrl, setPromoImageUrl] = useState("");
  const [promoIsActive, setPromoIsActive] = useState(false);
  const [categories, setCategories] = useState<HomeCmsCategory[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [initialDraft, setInitialDraft] = useState("");

  const [uploadingPromo, setUploadingPromo] = useState(false);
  const [uploadingCategories, setUploadingCategories] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [productQueries, setProductQueries] = useState<Record<string, string>>({});
  const [productFilters, setProductFilters] = useState<Record<string, "all" | "active" | "unavailable">>({});
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCategoryKey, setPickerCategoryKey] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLang, setPreviewLang] = useState<"ru" | "kk">("ru");
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const draft = useMemo(() => serializeDraft({ promoTitleRu, promoTitleKk, promoImageUrl, promoIsActive, categories }), [promoTitleRu, promoTitleKk, promoImageUrl, promoIsActive, categories]);
  const dirty = Boolean(initialDraft) && draft !== initialDraft;

  const activeCategories = useMemo(() => categories.filter((category) => category.isActive).length, [categories]);
  const totalProducts = useMemo(() => categories.reduce((sum, category) => sum + category.products.length, 0), [categories]);
  const activeProducts = useMemo(() => categories.reduce((sum, category) => sum + category.products.filter((product) => product.isActive && product.product?.isAvailable !== false).length, 0), [categories]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  async function loadSessionPermissions() {
    try {
      const response = await fetch("/api/session", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) return;
      const session = (await response.json()) as SessionResponse;
      const admin = session.admin;
      const roles = admin?.roleCodes ?? admin?.roles ?? [];
      const permissions = admin?.permissionCodes ?? admin?.permissions ?? [];
      setCanUpdate(
        roles.includes("SUPER_ADMIN") ||
        permissions.includes("admin.full_access") ||
        permissions.includes("homeCms.update"),
      );
    } catch {
      setCanUpdate(false);
    }
  }

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<HomeCmsAdminResponse>("/home-cms/admin");
      const nextCategories: HomeCmsCategory[] = Array.isArray(data.categories)
        ? data.categories.map((category, index) => ({
            ...category,
            clientKey: category.id || makeKey(),
            imageUrl: category.imageUrl || "",
            sortOrder: Number.isInteger(category.sortOrder) ? category.sortOrder : index,
            isActive: category.isActive !== false,
            products: Array.isArray(category.products)
              ? category.products.map((product, productIndex) => ({
                  ...product,
                  sortOrder: Number.isInteger(product.sortOrder) ? product.sortOrder : productIndex,
                  isActive: product.isActive !== false,
                }))
              : [],
          }))
        : [];

      setPromoTitleRu(data.promoTitleRu || "");
      setPromoTitleKk(data.promoTitleKk || "");
      setPromoImageUrl(data.promoImageUrl || "");
      setPromoIsActive(Boolean(data.promoIsActive));
      setCategories(nextCategories);
      setUpdatedAt(data.updatedAt || null);
      setInitialDraft(serializeDraft({
        promoTitleRu: data.promoTitleRu || "",
        promoTitleKk: data.promoTitleKk || "",
        promoImageUrl: data.promoImageUrl || "",
        promoIsActive: Boolean(data.promoIsActive),
        categories: nextCategories,
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить CMS");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.all([loadData(), loadSessionPermissions()]);
  }, []);

  function updateCategory(clientKey: string, patch: Partial<HomeCmsCategory>) {
    setCategories((current) => current.map((category) => category.clientKey === clientKey ? { ...category, ...patch } : category));
  }

  function moveCategory(clientKey: string, direction: -1 | 1) {
    setCategories((current) => {
      const index = current.findIndex((category) => category.clientKey === clientKey);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((category, categoryIndex) => ({ ...category, sortOrder: categoryIndex }));
    });
  }

  function addCategory() {
    const clientKey = makeKey();
    setCategories((current) => [
      ...current,
      { clientKey, titleRu: "", titleKk: "", imageUrl: "", sortOrder: current.length, isActive: false, products: [] },
    ]);
    setExpanded((current) => ({ ...current, [clientKey]: true }));
    setVisibleCounts((current) => ({ ...current, [clientKey]: PAGE_SIZE }));
  }

  function requestRemoveCategory(category: HomeCmsCategory) {
    setConfirmState({
      title: "Удалить категорию?",
      message: `Категория «${category.titleRu || category.titleKk || "Без названия"}» и все её привязки к блюдам будут удалены после сохранения.`,
      confirmLabel: "Удалить категорию",
      onConfirm: () => {
        setCategories((current) => current.filter((item) => item.clientKey !== category.clientKey).map((item, index) => ({ ...item, sortOrder: index })));
        setConfirmState(null);
      },
    });
  }

  function requestRemoveProduct(categoryKey: string, productIndex: number) {
    const category = categories.find((item) => item.clientKey === categoryKey);
    const product = category?.products[productIndex];
    if (!category || !product) return;
    setConfirmState({
      title: "Убрать блюдо из категории?",
      message: `«${product.product?.titleRu || product.product?.titleKk || "Блюдо"}» исчезнет из этой подборки после сохранения. Само блюдо ресторана не удаляется.`,
      confirmLabel: "Убрать блюдо",
      onConfirm: () => {
        setCategories((current) => current.map((item) => {
          if (item.clientKey !== categoryKey) return item;
          return { ...item, products: item.products.filter((_, index) => index !== productIndex).map((row, index) => ({ ...row, sortOrder: index })) };
        }));
        setConfirmState(null);
      },
    });
  }

  function moveProduct(categoryKey: string, productId: string, direction: -1 | 1) {
    setCategories((current) => current.map((category) => {
      if (category.clientKey !== categoryKey) return category;
      const index = category.products.findIndex((product) => product.productId === productId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= category.products.length) return category;
      const products = [...category.products];
      [products[index], products[target]] = [products[target], products[index]];
      return { ...category, products: products.map((product, productIndex) => ({ ...product, sortOrder: productIndex })) };
    }));
  }

  async function handlePromoUpload(file: File) {
    setUploadingPromo(true);
    setError(null);
    try {
      setPromoImageUrl(await uploadImage(file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка загрузки изображения");
    } finally {
      setUploadingPromo(false);
    }
  }

  async function handleCategoryUpload(clientKey: string, file: File) {
    setUploadingCategories((current) => ({ ...current, [clientKey]: true }));
    setError(null);
    try {
      updateCategory(clientKey, { imageUrl: await uploadImage(file) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка загрузки изображения");
    } finally {
      setUploadingCategories((current) => ({ ...current, [clientKey]: false }));
    }
  }

  function validateBeforeSave() {
    for (const category of categories) {
      if (!category.titleRu.trim()) throw new Error("У каждой категории должно быть название RU");
      if (!category.titleKk.trim()) throw new Error("У каждой категории должно быть название KZ");
    }
  }

  async function saveAll() {
    if (!canUpdate || saving) return;
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      validateBeforeSave();
      await apiFetch("/home-cms/admin/promo", {
        method: "PUT",
        body: JSON.stringify({ promoTitleRu, promoTitleKk, promoImageUrl, promoIsActive }),
      });
      await apiFetch("/home-cms/admin/categories", {
        method: "PUT",
        body: JSON.stringify({ categories: normalizeCategories(categories) }),
      });
      setOk("Главная приложения сохранена");
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить изменения");
    } finally {
      setSaving(false);
    }
  }

  const pickerCategory = pickerCategoryKey ? categories.find((category) => category.clientKey === pickerCategoryKey) ?? null : null;

  if (loading) {
    return <div className="container-fluid py-6"><div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-slate-200 bg-white"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div></div>;
  }

  return (
    <div className="container-fluid min-h-screen bg-slate-50/60 py-5 pb-28">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Главная приложения</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Промо, категории и подборки блюд клиентского приложения</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setPreviewOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:bg-slate-50"><Eye className="h-4 w-4" />Предпросмотр</button>
          <button type="button" onClick={saveAll} disabled={!canUpdate || !dirty || saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><Save className="h-4 w-4" />{saving ? "Сохранение..." : "Сохранить всё"}</button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <CompactStat label="Акция" value={promoIsActive ? "Включена" : "Выключена"} dot={promoIsActive ? "green" : "gray"} />
        <CompactStat label="Категорий" value={String(categories.length)} />
        <CompactStat label="Активных" value={String(activeCategories)} />
        <CompactStat label="Блюд" value={String(totalProducts)} />
        <CompactStat label="Активных блюд" value={String(activeProducts)} />
        <CompactStat label="Обновлено" value={formatUpdatedAt(updatedAt)} />
      </div>

      {!canUpdate ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />У вашей роли есть доступ к просмотру CMS, но нет права homeCms.update. Редактирование отключено.</div>
      ) : null}
      {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}
      {ok ? <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{ok}</div> : null}

      <Panel className="mb-4 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div><h2 className="text-lg font-extrabold text-slate-950">Акция дня</h2><p className="mt-0.5 text-xs font-medium text-slate-500">Промо-блок в верхней части главной</p></div>
          <Toggle checked={promoIsActive} onChange={setPromoIsActive} label={promoIsActive ? "Показывается" : "Скрыта"} disabled={!canUpdate} />
        </div>
        <div className="grid gap-4 p-5 xl:grid-cols-[1fr_0.9fr_1fr]">
          <div className="grid content-start gap-3">
            <Field label="Заголовок RU" value={promoTitleRu} onChange={setPromoTitleRu} disabled={!canUpdate} placeholder="Покупай выгоднее" />
            <Field label="Заголовок KZ" value={promoTitleKk} onChange={setPromoTitleKk} disabled={!canUpdate} placeholder="Тиімді сатып ал" />
          </div>
          <ImagePicker imageUrl={promoImageUrl} onUploaded={handlePromoUpload} loading={uploadingPromo} disabled={!canUpdate} />
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
            <div className="relative h-36">
              {promoImageUrl ? <img src={resolveImageUrl(promoImageUrl)} alt="" className="h-full w-full object-cover" /> : <div className="h-full bg-slate-800" />}
              <div className="absolute inset-0 bg-black/35" />
              <div className="absolute inset-x-0 bottom-0 p-4"><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/75">Предпросмотр</div><div className="mt-1 text-xl font-black uppercase text-white">{promoTitleRu || promoTitleKk || "Акция дня"}</div></div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div><h2 className="text-lg font-extrabold text-slate-950">Категории главной</h2><p className="mt-0.5 text-xs font-medium text-slate-500">Категории свернуты по умолчанию. Блюда загружаются компактными списками по 20 строк.</p></div>
          <button type="button" disabled={!canUpdate} onClick={addCategory} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-40"><Plus className="h-4 w-4" />Добавить категорию</button>
        </div>

        {categories.length === 0 ? (
          <div className="p-10 text-center text-sm font-medium text-slate-500">Категорий пока нет</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {categories.map((category, categoryIndex) => {
              const isExpanded = Boolean(expanded[category.clientKey]);
              const query = productQueries[category.clientKey] || "";
              const filter = productFilters[category.clientKey] || "all";
              const visibleCount = visibleCounts[category.clientKey] || PAGE_SIZE;
              const filtered = category.products.filter((row) => {
                const haystack = `${row.product?.titleRu || ""} ${row.product?.titleKk || ""} ${row.product?.restaurant?.nameRu || ""} ${row.product?.restaurant?.nameKk || ""}`.toLowerCase();
                if (query.trim() && !haystack.includes(query.trim().toLowerCase())) return false;
                if (filter === "active" && !(row.isActive && row.product?.isAvailable !== false)) return false;
                if (filter === "unavailable" && row.product?.isAvailable !== false) return false;
                return true;
              });
              const shown = filtered.slice(0, visibleCount);
              const availableCount = category.products.filter((row) => row.isActive && row.product?.isAvailable !== false).length;

              return (
                <div key={category.clientKey} className="bg-white">
                  <div className="grid gap-3 px-4 py-3 md:grid-cols-[auto_56px_minmax(0,1fr)_auto_auto_auto] md:items-center">
                    <div className="hidden gap-1 md:flex">
                      <button type="button" disabled={!canUpdate || categoryIndex === 0} onClick={() => moveCategory(category.clientKey, -1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-25" title="Поднять"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button type="button" disabled={!canUpdate || categoryIndex === categories.length - 1} onClick={() => moveCategory(category.clientKey, 1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-25" title="Опустить"><ArrowDown className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="h-12 w-14 overflow-hidden rounded-lg bg-slate-100">{category.imageUrl ? <img src={resolveImageUrl(category.imageUrl)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-400"><Package className="h-4 w-4" /></div>}</div>
                    <button type="button" onClick={() => setExpanded((current) => ({ ...current, [category.clientKey]: !isExpanded }))} className="min-w-0 text-left">
                      <div className="truncate text-sm font-extrabold text-slate-950">{category.titleRu || category.titleKk || "Новая категория"}</div>
                      <div className="mt-0.5 truncate text-xs font-medium text-slate-500">{category.titleKk || "Название KZ не заполнено"}</div>
                    </button>
                    <div className="text-xs font-semibold text-slate-600"><span className="font-extrabold text-slate-900">{category.products.length}</span> блюд · {availableCount} доступно</div>
                    <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-bold ${category.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{category.isActive ? "Активна" : "Скрыта"}</span>
                    <button type="button" onClick={() => setExpanded((current) => ({ ...current, [category.clientKey]: !isExpanded }))} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 hover:bg-slate-50">{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{isExpanded ? "Свернуть" : `Показать блюда (${category.products.length})`}</button>
                  </div>

                  {isExpanded ? (
                    <div className="border-t border-slate-200 bg-slate-50/70 p-4">
                      <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_1fr_240px_auto] xl:items-end">
                        <Field label="Название RU" value={category.titleRu} onChange={(value) => updateCategory(category.clientKey, { titleRu: value })} disabled={!canUpdate} />
                        <Field label="Название KZ" value={category.titleKk} onChange={(value) => updateCategory(category.clientKey, { titleKk: value })} disabled={!canUpdate} />
                        <ImagePicker compact imageUrl={category.imageUrl} onUploaded={(file) => handleCategoryUpload(category.clientKey, file)} loading={Boolean(uploadingCategories[category.clientKey])} disabled={!canUpdate} />
                        <div className="flex flex-col gap-3 pb-1"><Toggle checked={category.isActive} onChange={(value) => updateCategory(category.clientKey, { isActive: value })} label="Категория активна" disabled={!canUpdate} /><button type="button" disabled={!canUpdate} onClick={() => requestRemoveCategory(category)} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" />Удалить категорию</button></div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white">
                        <div className="flex flex-col gap-3 border-b border-slate-200 p-3 lg:flex-row lg:items-center lg:justify-between">
                          <div><div className="text-sm font-extrabold text-slate-950">Блюда</div><div className="text-xs font-medium text-slate-500">Показываем по {PAGE_SIZE}, чтобы категория не растягивала страницу</div></div>
                          <button type="button" disabled={!canUpdate} onClick={() => { setPickerCategoryKey(category.clientKey); setPickerOpen(true); }} className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white disabled:opacity-40"><Plus className="h-3.5 w-3.5" />Добавить блюда</button>
                        </div>
                        <div className="grid gap-2 border-b border-slate-200 p-3 md:grid-cols-[1fr_auto]">
                          <div className="flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3"><Search className="h-3.5 w-3.5 text-slate-400" /><input value={query} onChange={(event) => { setProductQueries((current) => ({ ...current, [category.clientKey]: event.target.value })); setVisibleCounts((current) => ({ ...current, [category.clientKey]: PAGE_SIZE })); }} placeholder="Поиск по блюду или ресторану" className="h-full w-full bg-transparent text-sm outline-none" /></div>
                          <div className="flex rounded-lg border border-slate-300 bg-white p-1">{(["all", "active", "unavailable"] as const).map((value) => <button key={value} type="button" onClick={() => setProductFilters((current) => ({ ...current, [category.clientKey]: value }))} className={`rounded-md px-3 py-1 text-xs font-bold ${filter === value ? "bg-slate-950 text-white" : "text-slate-600"}`}>{value === "all" ? "Все" : value === "active" ? "Активные" : "Недоступные"}</button>)}</div>
                        </div>

                        {shown.length === 0 ? <div className="p-8 text-center text-sm font-medium text-slate-500">Блюд по выбранному фильтру нет</div> : (
                          <div className="divide-y divide-slate-100">
                            {shown.map((row) => {
                              const sourceIndex = category.products.findIndex((item) => item.productId === row.productId);
                              const restaurantClosed = row.product?.restaurant?.runtimeStatus === "CLOSED";
                              return (
                                <div key={row.id || row.productId} className="grid gap-3 px-3 py-2.5 md:grid-cols-[48px_minmax(0,1fr)_auto_auto_auto] md:items-center">
                                  <div className="h-11 w-12 overflow-hidden rounded-lg bg-slate-100">{row.product?.imageUrl ? <img src={resolveImageUrl(row.product.imageUrl)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-400"><Package className="h-4 w-4" /></div>}</div>
                                  <div className="min-w-0"><div className="truncate text-sm font-bold text-slate-900">{row.product?.titleRu || row.product?.titleKk || "Без названия"}</div><div className="mt-0.5 truncate text-xs text-slate-500">{row.product?.restaurant?.nameRu || row.product?.restaurant?.nameKk || "Ресторан"} · {row.product?.price ?? 0} ₸</div></div>
                                  <div className="flex flex-wrap gap-1.5"><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${row.product?.isAvailable === false ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{row.product?.isAvailable === false ? "Недоступно" : "Доступно"}</span>{restaurantClosed ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800">Ресторан закрыт</span> : null}</div>
                                  <div className="flex items-center gap-1"><button type="button" disabled={!canUpdate || sourceIndex <= 0} onClick={() => moveProduct(category.clientKey, row.productId, -1)} className="rounded-md border border-slate-200 p-1.5 text-slate-500 disabled:opacity-25"><ArrowUp className="h-3 w-3" /></button><button type="button" disabled={!canUpdate || sourceIndex === category.products.length - 1} onClick={() => moveProduct(category.clientKey, row.productId, 1)} className="rounded-md border border-slate-200 p-1.5 text-slate-500 disabled:opacity-25"><ArrowDown className="h-3 w-3" /></button></div>
                                  <div className="flex items-center justify-end gap-2"><button type="button" disabled={!canUpdate} onClick={() => setCategories((current) => current.map((item) => item.clientKey === category.clientKey ? { ...item, products: item.products.map((product) => product.productId === row.productId ? { ...product, isActive: !product.isActive } : product) } : item))} className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${row.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{row.isActive ? "Активно" : "Скрыто"}</button><button type="button" disabled={!canUpdate} onClick={() => requestRemoveProduct(category.clientKey, sourceIndex)} className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button></div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {filtered.length > shown.length ? <div className="border-t border-slate-200 p-3 text-center"><button type="button" onClick={() => setVisibleCounts((current) => ({ ...current, [category.clientKey]: visibleCount + PAGE_SIZE }))} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Показать ещё {Math.min(PAGE_SIZE, filtered.length - shown.length)} · {shown.length} из {filtered.length}</button></div> : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {dirty ? (
        <div className="fixed inset-x-0 bottom-0 z-[120] border-t border-slate-300 bg-white/95 px-4 py-3 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur md:left-[var(--sidebar-width,0px)]">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />Есть несохранённые изменения</div><div className="flex gap-2"><button type="button" onClick={() => void loadData()} className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700">Отменить изменения</button><button type="button" disabled={!canUpdate || saving} onClick={saveAll} className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-40"><Save className="h-4 w-4" />{saving ? "Сохранение..." : "Сохранить всё"}</button></div></div>
        </div>
      ) : null}

      {pickerOpen && pickerCategory ? (
        <ProductsPickerModal
          categoryId={pickerCategory.id}
          categoryTitle={pickerCategory.titleRu || pickerCategory.titleKk || "Новая категория"}
          existingProductIds={pickerCategory.products.map((item) => item.productId)}
          nextSortOrder={pickerCategory.products.length}
          onClose={() => { setPickerOpen(false); setPickerCategoryKey(null); }}
          onApply={(items) => {
            setCategories((current) => current.map((category) => {
              if (category.clientKey !== pickerCategory.clientKey) return category;
              const productIds = new Set(category.products.map((item) => item.productId));
              const additions = items.filter((item) => !productIds.has(item.productId));
              return { ...category, products: [...category.products, ...additions].map((item, index) => ({ ...item, sortOrder: index })) };
            }));
            setPickerOpen(false);
            setPickerCategoryKey(null);
            setExpanded((current) => ({ ...current, [pickerCategory.clientKey]: true }));
          }}
        />
      ) : null}

      {previewOpen ? (
        <div className="fixed inset-0 z-[220] flex justify-end bg-slate-950/50 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewOpen(false); }}>
          <div className="h-full w-full max-w-[520px] overflow-auto bg-slate-100 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between"><div><div className="text-xl font-extrabold text-slate-950">Предпросмотр приложения</div><div className="text-xs font-medium text-slate-500">Черновик до сохранения</div></div><button type="button" onClick={() => setPreviewOpen(false)} className="rounded-xl border border-slate-300 bg-white p-2"><X className="h-4 w-4" /></button></div>
            <div className="mb-4 flex w-fit rounded-xl border border-slate-300 bg-white p-1"><button type="button" onClick={() => setPreviewLang("ru")} className={`rounded-lg px-4 py-2 text-xs font-bold ${previewLang === "ru" ? "bg-slate-950 text-white" : "text-slate-600"}`}>RU</button><button type="button" onClick={() => setPreviewLang("kk")} className={`rounded-lg px-4 py-2 text-xs font-bold ${previewLang === "kk" ? "bg-slate-950 text-white" : "text-slate-600"}`}>KZ</button></div>
            <div className="mx-auto max-w-[390px] overflow-hidden rounded-[34px] border-[8px] border-slate-950 bg-white shadow-xl">
              <div className="h-5 bg-slate-950" />
              <div className="space-y-5 p-4">
                {promoIsActive ? <div className="relative h-36 overflow-hidden rounded-2xl bg-slate-800">{promoImageUrl ? <img src={resolveImageUrl(promoImageUrl)} alt="" className="h-full w-full object-cover" /> : null}<div className="absolute inset-0 bg-black/35" /><div className="absolute inset-x-0 bottom-0 p-4 text-xl font-black uppercase text-white">{previewLang === "ru" ? promoTitleRu || "Акция дня" : promoTitleKk || "Күн акциясы"}</div></div> : null}
                {categories.filter((category) => category.isActive).map((category) => <div key={category.clientKey}><div className="mb-2 text-base font-extrabold text-slate-950">{previewLang === "ru" ? category.titleRu : category.titleKk}</div><div className="flex gap-2 overflow-hidden">{category.products.filter((product) => product.isActive && product.product?.isAvailable !== false).slice(0, 3).map((product) => <div key={product.productId} className="w-[108px] shrink-0"><div className="h-20 overflow-hidden rounded-xl bg-slate-100">{product.product?.imageUrl ? <img src={resolveImageUrl(product.product.imageUrl)} alt="" className="h-full w-full object-cover" /> : null}</div><div className="mt-1 line-clamp-2 text-xs font-bold text-slate-900">{previewLang === "ru" ? product.product?.titleRu : product.product?.titleKk}</div><div className="text-[11px] font-semibold text-slate-500">{product.product?.price ?? 0} ₸</div></div>)}</div></div>)}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {confirmState ? (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><div className="text-lg font-extrabold text-slate-950">{confirmState.title}</div><p className="mt-2 text-sm leading-6 text-slate-600">{confirmState.message}</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setConfirmState(null)} className="h-10 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700">Отмена</button><button type="button" onClick={confirmState.onConfirm} className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white"><Trash2 className="h-4 w-4" />{confirmState.confirmLabel}</button></div></div>
        </div>
      ) : null}
    </div>
  );
}
