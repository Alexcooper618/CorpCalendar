"use client";

import React from "react";

const ALL_EMPLOYEES_ID = "all-employees";
const ALL_EMPLOYEES_LABEL = "Все сотрудники";

export interface Product {
  id: string;
  name: string;
  code?: string;
  cluster?: string;
  year?: number;
  audienceId?: string;
  audienceIds?: string[];
  audience?: {
    id: string;
    name: string;
  };
  description?: string;
  owner?: string;
  status?: string;
  sourceSystem?: string;
}

interface ProductCardGridProps {
  products: Product[];
  audienceLookup: Map<string, string>;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  emptyHint?: React.ReactNode;
}

export function ProductCardGrid({
  products,
  audienceLookup,
  onEdit,
  onDelete,
  emptyHint,
}: ProductCardGridProps) {
  const resolvedAudience = (product: Product) => {
    const ids = product.audienceIds?.length
      ? product.audienceIds
      : product.audienceId
      ? [product.audienceId]
      : [];
    if (ids.includes(ALL_EMPLOYEES_ID)) {
      return ALL_EMPLOYEES_LABEL;
    }
    const labels = ids
      .map((id) => audienceLookup.get(id))
      .filter((label): label is string => Boolean(label));
    if (labels.length) {
      if (labels.length > 3) {
        return `${labels.slice(0, 3).join(", ")} и ещё ${labels.length - 3}`;
      }
      return labels.join(", ");
    }
    return product.audience?.name ?? "Не выбрана";
  };

  if (!products.length && emptyHint) {
    return <div className="text-sm text-slate-600">{emptyHint}</div>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <article
          key={product.id}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <header className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold leading-tight text-slate-900">
                {product.name}
              </h3>
              {product.code && (
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {product.code}
                </p>
              )}
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
              {product.cluster || "Кластер не указан"}
            </span>
          </header>

          <dl className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Год</dt>
              <dd className="font-medium">{product.year ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Аудитория</dt>
              <dd className="font-medium text-right">
                {resolvedAudience(product)}
              </dd>
            </div>
            {product.owner && (
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Отв. за продукт</dt>
                <dd className="font-medium">{product.owner}</dd>
              </div>
            )}
            {product.status && (
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Статус</dt>
                <dd className="font-medium">{product.status}</dd>
              </div>
            )}
            {product.sourceSystem && (
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Система</dt>
                <dd className="font-medium">{product.sourceSystem}</dd>
              </div>
            )}
          </dl>

          {product.description && (
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              {product.description}
            </p>
          )}

          <footer className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(product)}
              className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
            >
              Редактировать
            </button>
            <button
              type="button"
              onClick={() => onDelete(product.id)}
              className="inline-flex flex-1 items-center justify-center rounded-md border border-transparent bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              Удалить
            </button>
          </footer>
        </article>
      ))}
    </div>
  );
}
