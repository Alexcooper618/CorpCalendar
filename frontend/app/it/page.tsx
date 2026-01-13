"use client";

import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { buildApiUrl } from "../lib/api";
import { Product, ProductCardGrid } from "../components/ProductCardGrid";

type AudienceNode = {
  id: string;
  name: string;
  parentId?: string | null;
  path: string;
  children?: AudienceNode[];
};

type FlatAudience = AudienceNode & { depth: number; pathLabel: string };

const ALL_EMPLOYEES_ID = "all-employees";
const ALL_EMPLOYEES_LABEL = "Все сотрудники";

const now = new Date();
const nearbyYears = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

function flattenAudiences(
  nodes: AudienceNode[],
  depth = 0,
  chain: string[] = []
): FlatAudience[] {
  return nodes.flatMap((node) => {
    const path = [...chain, node.name];
    const current: FlatAudience = {
      ...node,
      depth,
      pathLabel: path.join(" / "),
    };

    const children = node.children
      ? flattenAudiences(node.children, depth + 1, path)
      : [];

    return [current, ...children];
  });
}

function normalizeList<T>(payload: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const asAny = payload as Record<string, unknown>;
    if (Array.isArray(asAny.items)) return asAny.items as T[];
    if (Array.isArray(asAny.data)) return asAny.data as T[];
    if (Array.isArray(asAny.results)) return asAny.results as T[];
  }
  return fallback;
}

function filterAudienceTree(
  nodes: AudienceNode[],
  query: string
): AudienceNode[] {
  if (!query.trim()) return nodes;
  const lowered = query.trim().toLowerCase();
  return nodes.flatMap((node) => {
    const matches = node.name.toLowerCase().includes(lowered);
    const filteredChildren = node.children
      ? filterAudienceTree(node.children, query)
      : [];
    if (matches || filteredChildren.length) {
      return [{ ...node, children: filteredChildren }];
    }
    return [];
  });
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [audiences, setAudiences] = useState<AudienceNode[]>([]);
  const [yearFilter, setYearFilter] = useState<number | "">(now.getFullYear());
  const [clusterFilter, setClusterFilter] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncingAudiences, setIsSyncingAudiences] = useState(false);
  const [isImportingAudiences, setIsImportingAudiences] = useState(false);
  const [audienceQuery, setAudienceQuery] = useState("");
  const [audienceImportPayload, setAudienceImportPayload] = useState("");
  const [expandedAudienceIds, setExpandedAudienceIds] = useState(
    () => new Set<string>()
  );
  const [formState, setFormState] = useState({
    id: "",
    name: "",
    code: "",
    cluster: "",
    year: now.getFullYear(),
    audienceIds: [] as string[],
    owner: "",
    status: "",
    sourceSystem: "",
    description: "",
    importPayload: "",
  });

  const toggleAudienceExpanded = useCallback((audienceId: string) => {
    setExpandedAudienceIds((prev) => {
      const next = new Set(prev);
      if (next.has(audienceId)) {
        next.delete(audienceId);
      } else {
        next.add(audienceId);
      }
      return next;
    });
  }, []);

  const toggleAudienceSelection = useCallback((audience: AudienceNode) => {
    setFormState((prev) => {
      const nextIds = new Set(prev.audienceIds);
      if (nextIds.has(audience.id)) {
        nextIds.delete(audience.id);
      } else {
        nextIds.add(audience.id);
      }
      return {
        ...prev,
        audienceIds: Array.from(nextIds),
      };
    });
  }, []);

  const audienceTree = useMemo<AudienceNode[]>(() => {
    if (!audiences.length) return [];
    return [
      {
        id: ALL_EMPLOYEES_ID,
        name: ALL_EMPLOYEES_LABEL,
        parentId: null,
        path: ALL_EMPLOYEES_LABEL,
        children: audiences,
      },
    ];
  }, [audiences]);

  const flattenedAudiences = useMemo(
    () => flattenAudiences(audienceTree),
    [audienceTree]
  );

  const audienceLookup = useMemo(() => {
    const map = new Map<string, string>();
    flattenedAudiences.forEach((audience) => {
      if (audience.id === ALL_EMPLOYEES_ID) {
        map.set(audience.id, ALL_EMPLOYEES_LABEL);
        return;
      }
      const trimmed = audience.pathLabel.startsWith(`${ALL_EMPLOYEES_LABEL} / `)
        ? audience.pathLabel.replace(`${ALL_EMPLOYEES_LABEL} / `, "")
        : audience.pathLabel;
      map.set(audience.id, trimmed);
    });
    return map;
  }, [flattenedAudiences]);

  const filteredAudienceTree = useMemo(
    () => filterAudienceTree(audienceTree, audienceQuery),
    [audienceTree, audienceQuery]
  );

  const audienceMaps = useMemo(() => {
    const byId = new Map<string, AudienceNode>();
    const parentMap = new Map<string, string | null | undefined>();
    const walk = (nodes: AudienceNode[], parentId?: string | null) => {
      nodes.forEach((node) => {
        byId.set(node.id, node);
        parentMap.set(node.id, parentId);
        if (node.children?.length) {
          walk(node.children, node.id);
        }
      });
    };
    walk(audienceTree);
    return { byId, parentMap };
  }, [audienceTree]);

  const selectedAudienceIds = useMemo(
    () => new Set(formState.audienceIds),
    [formState.audienceIds]
  );

  const effectiveExpandedAudienceIds = useMemo(() => {
    if (!audienceQuery.trim()) {
      return expandedAudienceIds;
    }
    const autoExpanded = new Set<string>();
    const walk = (nodes: AudienceNode[]) => {
      nodes.forEach((node) => {
        if (node.children?.length) {
          autoExpanded.add(node.id);
          walk(node.children);
        }
      });
    };
    walk(filteredAudienceTree);
    return autoExpanded;
  }, [audienceQuery, filteredAudienceTree, expandedAudienceIds]);

  const clusterOptions = useMemo(() => {
    const clusters = new Set<string>();
    products.forEach((product) => {
      if (product.cluster) clusters.add(product.cluster);
    });
    return Array.from(clusters).sort();
  }, [products]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    products.forEach((product) => {
      if (product.year) years.add(product.year);
    });
    nearbyYears.forEach((year) => years.add(year));
    return Array.from(years).sort((a, b) => a - b);
  }, [products]);

  const loadAudiences = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl("/api/audiences"));
      if (!response.ok) {
        throw new Error("Не удалось загрузить аудитории");
      }
      const data = await response.json();
      setAudiences(normalizeList<AudienceNode>(data));
    } catch (e) {
      console.error(e);
      setError("Ошибка загрузки аудиторий");
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      if (yearFilter) params.set("year", String(yearFilter));
      if (clusterFilter) params.set("cluster", clusterFilter);
      const url = buildApiUrl(
        `/api/products${params.toString() ? `?${params.toString()}` : ""}`
      );
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Не удалось загрузить продукты");
      }
      const data = await response.json();
      setProducts(normalizeList<Product>(data));
    } catch (e) {
      console.error(e);
      setError("Ошибка загрузки продуктов");
    } finally {
      setIsLoading(false);
    }
  }, [clusterFilter, yearFilter]);

  useEffect(() => {
    loadAudiences();
  }, [loadAudiences]);

  useEffect(() => {
    if (!audienceTree.length) return;
    const nextExpanded = new Set<string>();
    const walk = (nodes: AudienceNode[], depth: number) => {
      nodes.forEach((node) => {
        if (node.children?.length && depth < 2) {
          nextExpanded.add(node.id);
        }
        if (node.children?.length) {
          walk(node.children, depth + 1);
        }
      });
    };
    walk(audienceTree, 0);
    setExpandedAudienceIds(nextExpanded);
  }, [audienceTree]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSyncAudiences = useCallback(async () => {
    setError(null);
    setMessage(null);
    setIsSyncingAudiences(true);
    try {
      const response = await fetch(buildApiUrl("/api/audiences/sync"), {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Сервис синхронизации вернул ошибку");
      }
      const result = await response.json();
      setMessage(
        `Аудитории синхронизированы: создано ${result.created}, обновлено ${result.updated}, всего ${result.total}`
      );
      await loadAudiences();
    } catch (e) {
      console.error(e);
      setError("Не удалось выполнить синхронизацию аудиторий");
    } finally {
      setIsSyncingAudiences(false);
    }
  }, [loadAudiences]);

  const handleAudienceFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setMessage(null);
    try {
      const text = await file.text();
      setAudienceImportPayload(text);
    } catch (e) {
      console.error(e);
      setError("Не удалось прочитать файл");
    }
  };

  const handleImportAudiences = async () => {
    if (!audienceImportPayload.trim()) {
      setError("Добавьте JSON для импорта аудиторий");
      return;
    }
    setError(null);
    setMessage(null);
    setIsImportingAudiences(true);
    try {
      const response = await fetch(buildApiUrl("/api/audiences/import"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: audienceImportPayload,
      });
      if (!response.ok) {
        throw new Error("Импорт аудиторий завершился ошибкой");
      }
      const result = await response.json();
      setMessage(
        `Аудитории импортированы: создано ${result.created}, обновлено ${result.updated}, всего ${result.total}`
      );
      await loadAudiences();
    } catch (e) {
      console.error(e);
      setError("Не удалось импортировать аудитории");
    } finally {
      setIsImportingAudiences(false);
    }
  };

  const resetForm = () => {
    setFormState((prev) => ({
      ...prev,
      id: "",
      name: "",
      code: "",
      cluster: "",
      year: now.getFullYear(),
      audienceIds: [],
      owner: "",
      status: "",
      sourceSystem: "",
      description: "",
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    const payload = {
      name: formState.name,
      code: formState.code || undefined,
      cluster: formState.cluster || undefined,
      year: formState.year ? Number(formState.year) : undefined,
      audienceIds: formState.audienceIds,
      owner: formState.owner || undefined,
      status: formState.status || undefined,
      sourceSystem: formState.sourceSystem || undefined,
      description: formState.description || undefined,
    };

    try {
      const url = formState.id
        ? buildApiUrl(`/api/products/${formState.id}`)
        : buildApiUrl("/api/products");
      const method = formState.id ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Сервис продуктов вернул ошибку");
      }

      setMessage(formState.id ? "Продукт обновлён" : "Продукт создан");
      resetForm();
      await loadProducts();
    } catch (e) {
      console.error(e);
      setError("Не удалось сохранить продукт");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async () => {
    if (!formState.importPayload.trim()) {
      setError("Добавьте содержимое для импорта");
      return;
    }
    setError(null);
    setMessage(null);
    setIsImporting(true);
    try {
      const response = await fetch(buildApiUrl("/api/products/import"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: formState.importPayload,
      });
      if (!response.ok) {
        throw new Error("Импорт завершился ошибкой");
      }
      setMessage("Импорт завершён");
      await loadProducts();
    } catch (e) {
      console.error(e);
      setError("Не удалось импортировать продукты");
    } finally {
      setIsImporting(false);
    }
  };

  const handleEdit = (product: Product) => {
    const legacyAudienceId = product.audienceId ?? product.audience?.id;
    setFormState((prev) => ({
      ...prev,
      id: product.id,
      name: product.name,
      code: product.code || "",
      cluster: product.cluster || "",
      year: product.year || now.getFullYear(),
      audienceIds: product.audienceIds ?? (legacyAudienceId ? [legacyAudienceId] : []),
      owner: product.owner || "",
      status: product.status || "",
      sourceSystem: product.sourceSystem || "",
      description: product.description || "",
    }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (productId: string) => {
    setError(null);
    setMessage(null);
    if (!confirm("Удалить продукт?")) return;
    try {
      const response = await fetch(buildApiUrl(`/api/products/${productId}`), {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Удаление завершилось ошибкой");
      }
      setMessage("Продукт удалён");
      await loadProducts();
    } catch (e) {
      console.error(e);
      setError("Не удалось удалить продукт");
    }
  };

  const renderAudienceNode = (node: AudienceNode, depth = 0) => {
    const isExpanded = effectiveExpandedAudienceIds.has(node.id);
    const isSelected = selectedAudienceIds.has(node.id);
    const hasChildren = Boolean(node.children && node.children.length);

    return (
      <li key={node.id}>
        <div
          className="flex items-center gap-2 text-sm text-slate-700"
          style={{ paddingLeft: `${depth * 16}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleAudienceExpanded(node.id)}
              className="inline-flex h-5 w-5 items-center justify-center rounded border border-slate-200 text-xs font-semibold text-slate-600 hover:border-indigo-200 hover:text-indigo-700"
              aria-label={isExpanded ? "Свернуть группу" : "Развернуть группу"}
            >
              {isExpanded ? "−" : "+"}
            </button>
          ) : (
            <span className="inline-flex h-5 w-5" />
          )}
          <button
            type="button"
            onClick={() => toggleAudienceSelection(node)}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 transition"
            aria-pressed={isSelected}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isSelected ? "bg-emerald-500" : "bg-transparent"
              }`}
            />
          </button>
          <span>{node.name}</span>
        </div>
        {hasChildren && isExpanded && (
          <ul className="mt-1 space-y-1">
            {node.children?.map((child) => renderAudienceNode(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-indigo-700">Новый раздел</p>
        <h1 className="text-2xl font-semibold text-slate-900">
          Каталог продуктов и аудиторий
        </h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Управляйте продуктами, загружайте списки из внешних систем и
          связывайте их с аудиториями через вложенный выбор. Фильтры по году и
          кластеру помогают быстро находить нужные карточки.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Фильтры</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Год
            <select
              value={yearFilter}
              onChange={(e) =>
                setYearFilter(e.target.value ? Number(e.target.value) : "")
              }
              className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Все</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Кластер
            <select
              value={clusterFilter}
              onChange={(e) => setClusterFilter(e.target.value)}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Все</option>
              {clusterOptions.map((cluster) => (
                <option key={cluster} value={cluster}>
                  {cluster}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={loadProducts}
              className="inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Обновить
            </button>
            <button
              type="button"
              onClick={() => {
                setYearFilter(now.getFullYear());
                setClusterFilter("");
              }}
              className="inline-flex w-full items-center justify-center rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
            >
              Сбросить
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Синхронизация аудиторий с 1С
            </h2>
            <p className="text-sm text-slate-600">
              Забирает подразделения из сервиса сотрудников и обновляет справочник
              аудиторий.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSyncAudiences}
            disabled={isSyncingAudiences}
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
          >
            {isSyncingAudiences ? "Синхронизация..." : "Синхронизировать"}
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Импорт аудиторий из JSON
            </h2>
            <p className="text-sm text-slate-600">
              Загрузите JSON со списком сотрудников и подразделений, чтобы создать
              дерево аудиторий вручную.
            </p>
          </div>
          <label className="text-sm font-medium text-slate-700">
            Файл JSON
            <input
              type="file"
              accept="application/json,.json"
              onChange={handleAudienceFileChange}
              className="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
            />
          </label>
        </div>
        <textarea
          value={audienceImportPayload}
          onChange={(e) => setAudienceImportPayload(e.target.value)}
          rows={6}
          className="mt-3 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          placeholder='[{"name": "Иванов И.И.", "subdivision": "Блок\\Отдел"}]'
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleImportAudiences}
            disabled={isImportingAudiences}
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
          >
            {isImportingAudiences ? "Импорт..." : "Импортировать аудитории"}
          </button>
          <button
            type="button"
            onClick={() => setAudienceImportPayload("")}
            className="text-sm font-medium text-slate-700 underline"
          >
            Очистить поле
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Карточки продуктов</h2>
            <p className="text-sm text-slate-600">
              Просматривайте данные продуктов, обновляйте и удаляйте карточки.
            </p>
          </div>
          {isLoading && (
            <span className="text-xs font-medium text-indigo-700">Загрузка…</span>
          )}
        </div>

        <div className="mt-4">
          <ProductCardGrid
            products={products}
            audienceLookup={audienceLookup}
            onEdit={handleEdit}
            onDelete={handleDelete}
            emptyHint="Нет продуктов по выбранным фильтрам"
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-2 space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {formState.id ? "Редактирование продукта" : "Создать продукт"}
              </h2>
              <p className="text-sm text-slate-600">
                Заполните обязательные поля и выберите аудиторию через вложенный
                селектор.
              </p>
            </div>
            {formState.id && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm font-semibold text-indigo-700"
              >
                Новый продукт
              </button>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Название
              <input
                required
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Код / артикул
              <input
                value={formState.code}
                onChange={(e) => setFormState({ ...formState, code: e.target.value })}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Год
              <input
                type="number"
                value={formState.year}
                onChange={(e) =>
                  setFormState({ ...formState, year: Number(e.target.value) })
                }
                className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Кластер
              <input
                value={formState.cluster}
                onChange={(e) =>
                  setFormState({ ...formState, cluster: e.target.value })
                }
                className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Ответственный
              <input
                value={formState.owner}
                onChange={(e) => setFormState({ ...formState, owner: e.target.value })}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Статус
              <input
                value={formState.status}
                onChange={(e) => setFormState({ ...formState, status: e.target.value })}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Источник данных
              <input
                value={formState.sourceSystem}
                onChange={(e) =>
                  setFormState({ ...formState, sourceSystem: e.target.value })
                }
                className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Описание
            <textarea
              value={formState.description}
              onChange={(e) =>
                setFormState({ ...formState, description: e.target.value })
              }
              rows={3}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </label>

          <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
            <div className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              <span>Поиск аудитории</span>
              <input
                value={audienceQuery}
                onChange={(e) => setAudienceQuery(e.target.value)}
                placeholder="Введите часть названия"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <p className="text-xs font-normal text-slate-500">
                Раскройте группы и выберите несколько аудиторий кликом по буллету.
                При выборе верхнего уровня автоматически включаются вложенные
                группы.
              </p>
            </div>
            <div className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              <span>Выбор аудитории</span>
              <div className="max-h-64 overflow-auto rounded-md border border-slate-200 px-3 py-2">
                {filteredAudienceTree.length ? (
                  <ul className="space-y-1">
                    {filteredAudienceTree.map((node) => renderAudienceNode(node))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">
                    Ничего не найдено по запросу.
                  </p>
                )}
              </div>
              <p className="text-xs font-normal text-slate-500">
                Выбрано групп: {formState.audienceIds.length}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {isSubmitting
                ? "Сохранение..."
                : formState.id
                ? "Сохранить изменения"
                : "Создать продукт"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="text-sm font-medium text-slate-700 underline"
            >
              Очистить форму
            </button>
            {message && (
              <span className="text-sm font-medium text-emerald-700">{message}</span>
            )}
            {error && (
              <span className="text-sm font-medium text-rose-700">{error}</span>
            )}
          </div>
        </form>

        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Импорт продуктов</h2>
          <p className="text-sm text-slate-600">
            Вставьте JSON или NDJSON, полученный из внешних источников. Данные
            будут отправлены в API импорта продуктов.
          </p>
          <textarea
            value={formState.importPayload}
            onChange={(e) =>
              setFormState({ ...formState, importPayload: e.target.value })
            }
            rows={10}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            placeholder='[{"name": "Product", "cluster": "A", "year": 2025}]'
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleImport}
              disabled={isImporting}
              className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
            >
              {isImporting ? "Импорт..." : "Отправить на импорт"}
            </button>
            <button
              type="button"
              onClick={() => setFormState({ ...formState, importPayload: "" })}
              className="text-sm font-medium text-slate-700 underline"
            >
              Очистить поле
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
