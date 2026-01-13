"use client";

import React, { useEffect, useMemo, useState } from "react";
import { buildApiUrl } from "../lib/api";
import { AudiencePickerModal } from "./AudiencePickerModal";
import {
  AudienceNode,
  Event,
  EventType,
  parseAudienceIds,
  Product,
} from "./Calendar";

const PALETTE = [
  "#0284c7",
  "#7c3aed",
  "#16a34a",
  "#eab308",
  "#f97316",
  "#db2777",
  "#0ea5e9",
];

function toInputDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export const EventModal = ({
  range,
  events,
  products,
  audienceTree,
  audienceLookup,
  productsError,
  isLoadingProducts,
  onReloadProducts,
  onClose,
  onSaved,
}: {
  range: { start: Date; end?: Date; event?: Event };
  events: Event[];
  products: Product[];
  audienceTree: AudienceNode[];
  audienceLookup: Map<string, string>;
  productsError?: string;
  isLoadingProducts: boolean;
  onReloadProducts: () => void;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [title, setTitle] = useState(range.event?.title || "");
  const [type, setType] = useState<EventType>(range.event?.type || "custom");
  const [deptInput, setDeptInput] = useState(range.event?.dept || "");
  const [audienceId, setAudienceId] = useState("");
  const [owner, setOwner] = useState(range.event?.owner || "");
  const [startDate, setStartDate] = useState(
    toInputDate(new Date(range.event?.startDate || range.start))
  );
  const [endDate, setEndDate] = useState(
    toInputDate(new Date(range.event?.endDate || range.end || range.start))
  );
  const [productId, setProductId] = useState(range.event?.productId || "");
  const [plannedCsiDate, setPlannedCsiDate] = useState(
    range.event?.plannedCsiDate
      ? toInputDate(new Date(range.event.plannedCsiDate))
      : ""
  );
  const [color, setColor] = useState(range.event?.color || PALETTE[0]);
  const [comment, setComment] = useState(range.event?.comment || "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAudienceConflicts, setShowAudienceConflicts] = useState(false);
  const [isAudiencePickerOpen, setIsAudiencePickerOpen] = useState(false);

  const isEditing = Boolean(range.event);

  const titlePlaceholder = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "short",
    });

    if (range.end) {
      return `Опрос ${formatter.format(range.start)} — ${formatter.format(range.end)}`;
    }

    return `Опрос ${formatter.format(range.start)}`;
  }, [range.end, range.start]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === productId),
    [productId, products]
  );

  const resolveProductTitle = (product?: Product) =>
    product?.title ?? product?.name ?? "";

  const resolveProductOwner = (product?: Product) =>
    product?.productOwner ?? product?.owner ?? "";

  const previewTitle = useMemo(() => {
    if (type === "itProduct") {
      return resolveProductTitle(selectedProduct) || title || titlePlaceholder;
    }

    return title || titlePlaceholder;
  }, [selectedProduct, title, titlePlaceholder, type]);

  const updateFromRange = () => {
    setTitle(range.event?.title || "");
    setType(range.event?.type || "custom");
    const parsedAudiences = parseAudienceIds(range.event?.dept) ?? [];
    const defaultAudienceId = parsedAudiences.length === 1 ? parsedAudiences[0] : "";
    setAudienceId(defaultAudienceId);
    setDeptInput(defaultAudienceId ? "" : range.event?.dept || "");
    setOwner(range.event?.owner || "");
    setStartDate(toInputDate(new Date(range.event?.startDate || range.start)));
    setEndDate(toInputDate(new Date(range.event?.endDate || range.end || range.start)));
    setProductId(range.event?.productId || "");
    setPlannedCsiDate(
      range.event?.plannedCsiDate
        ? toInputDate(new Date(range.event.plannedCsiDate))
        : ""
    );
    setColor(range.event?.color || PALETTE[0]);
    setComment(range.event?.comment || "");
    setError("");
  };

  const handleTypeChange = (value: EventType) => {
    setType(value);

    if (value === "custom") {
      setProductId("");
      setPlannedCsiDate("");
      return;
    }

    if (!productId && products.length > 0) {
      setProductId(products[0].id);
    }
  };

  useEffect(() => {
    updateFromRange();
  }, [range]);

  useEffect(() => {
    if (type !== "custom") return;
    if (!deptInput || audienceId) return;
    if (audienceLookup.has(deptInput)) {
      setAudienceId(deptInput);
      setDeptInput("");
    }
  }, [audienceId, audienceLookup, deptInput, type]);

  useEffect(() => {
    if (type === "itProduct" && !productId && products.length > 0) {
      setProductId(products[0].id);
    }
  }, [productId, products, type]);

  useEffect(() => {
    if (type === "itProduct" && selectedProduct) {
      const productTitle = resolveProductTitle(selectedProduct);
      if (productTitle) {
        setTitle(productTitle);
      }

      if (!plannedCsiDate && selectedProduct.plannedCsiDate) {
        setPlannedCsiDate(toInputDate(new Date(selectedProduct.plannedCsiDate)));
      }
    }
  }, [plannedCsiDate, selectedProduct, type]);

  const save = async () => {
    if (!startDate || !endDate) {
      setError("Укажите даты начала и окончания опроса");
      return;
    }

    if (type === "itProduct" && !productId) {
      setError("Выберите продукт для опроса IT-продукта");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      setError("Дата окончания раньше даты начала");
      return;
    }

    const finalTitle =
      type === "itProduct"
        ? resolveProductTitle(selectedProduct) || title || titlePlaceholder
        : title || titlePlaceholder;

    if (!finalTitle.trim()) {
      setError("Укажите название опроса");
      return;
    }

    const plannedCsiDateIso =
      plannedCsiDate === ""
        ? null
        : plannedCsiDate
        ? new Date(plannedCsiDate).toISOString()
        : undefined;

    const deptValue =
      type === "custom" ? audienceId || deptInput.trim() : deptInput.trim();

    setError("");
    setIsSaving(true);

    try {
      const response = await fetch(
        buildApiUrl(`/api/events${isEditing ? `/${range.event?.id}` : ""}`),
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: finalTitle,
            type,
            productId: type === "itProduct" ? productId : undefined,
            plannedCsiDate: plannedCsiDateIso,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            dept: deptValue || undefined,
            owner: owner || undefined,
            color,
            comment: comment || undefined,
          } satisfies Partial<Event>),
        }
      );

      if (!response.ok) {
        const message = await response
          .json()
          .then((data) => data.message)
          .catch(() => undefined);

        throw new Error(message || "Не удалось сохранить событие");
      }

      onSaved();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Не удалось сохранить событие";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!range.event) return;

    const confirmed = window.confirm("Удалить этот опрос?");
    if (!confirmed) return;

    setError("");
    setIsDeleting(true);

    try {
      const response = await fetch(buildApiUrl(`/api/events/${range.event.id}`), {
        method: "DELETE",
      });

      if (!response.ok) {
        const message = await response
          .json()
          .then((data) => data.message)
          .catch(() => undefined);

        throw new Error(message || "Не удалось удалить событие");
      }

      onSaved();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Не удалось удалить событие";
      setError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const parseInputDate = (value: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const currentRange = useMemo(() => {
    const start = parseInputDate(startDate);
    const end = parseInputDate(endDate);
    if (!start || !end) return null;
    return { start, end };
  }, [endDate, startDate]);

  const resolveAudienceLabel = (audienceKey: string) => {
    const label = audienceLookup.get(audienceKey);
    if (typeof label === "string" && label.trim()) {
      return label;
    }
    if (label) {
      return String(label);
    }
    return audienceKey;
  };

  const resolveEventAudiences = (event: Event, product?: Product) => {
    if (event.type === "itProduct") {
      if (product?.audienceIds?.length) {
        return product.audienceIds;
      }
      if (product?.audienceId) {
        return [product.audienceId];
      }
      return [];
    }

    const deptValue = event.dept?.trim();
    return deptValue ? [deptValue] : [];
  };

  const selectedAudienceLabel = audienceId
    ? resolveAudienceLabel(audienceId)
    : "";

  const currentAudienceKeys = useMemo(() => {
    if (type === "itProduct") {
      if (selectedProduct?.audienceIds?.length) {
        return selectedProduct.audienceIds;
      }
      if (selectedProduct?.audienceId) {
        return [selectedProduct.audienceId];
      }
      return [];
    }
    const deptValue = (audienceId || deptInput).trim();
    return deptValue ? [deptValue] : [];
  }, [audienceId, deptInput, selectedProduct, type]);

  const rangesOverlap = (startA: Date, endA: Date, startB: Date, endB: Date) =>
    startA <= endB && endA >= startB;

  const audienceConflicts = useMemo(() => {
    if (!currentRange) return [];
    if (!currentAudienceKeys.length) return [];

    const conflicts = new Map<
      string,
      {
        label: string;
        events: Event[];
      }
    >();

    events.forEach((event) => {
      if (isEditing && event.id === range.event?.id) {
        return;
      }

      const eventStart = parseInputDate(event.startDate);
      const eventEnd = parseInputDate(event.endDate);
      if (!eventStart || !eventEnd) return;
      if (!rangesOverlap(currentRange.start, currentRange.end, eventStart, eventEnd)) {
        return;
      }

      const eventProduct = event.productId
        ? products.find((product) => product.id === event.productId)
        : undefined;
      const eventAudiences = resolveEventAudiences(event, eventProduct);
      if (!eventAudiences.length) return;

      const sharedAudiences = eventAudiences.filter((key) =>
        currentAudienceKeys.includes(key)
      );

      sharedAudiences.forEach((audienceKey) => {
        const label = resolveAudienceLabel(audienceKey);
        const existing = conflicts.get(audienceKey);
        if (existing) {
          existing.events.push(event);
        } else {
          conflicts.set(audienceKey, { label, events: [event] });
        }
      });
    });

    return Array.from(conflicts.entries()).map(([key, value]) => ({
      key,
      ...value,
    }));
  }, [
    currentAudienceKeys,
    currentRange,
    events,
    isEditing,
    products,
    range.event?.id,
  ]);

  const hasAudienceForCheck = currentAudienceKeys.length > 0;

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const heading = isEditing ? "Редактирование опроса" : "Новый опрос";

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">{heading}</p>
            <h3 className="font-semibold text-lg">{previewTitle}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 text-sm"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2">
          <span className="text-sm text-slate-700">Тип опроса</span>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={type === "custom"}
                onChange={() => handleTypeChange("custom")}
              />
              <span>Пользовательский</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={type === "itProduct"}
                onChange={() => handleTypeChange("itProduct")}
              />
              <span>IT продукт</span>
            </label>
            <button
              type="button"
              onClick={onReloadProducts}
              className="text-xs text-blue-700 underline decoration-dotted"
            >
              Обновить справочник
            </button>
          </div>
          {productsError && (
            <div className="text-xs text-red-600">{productsError}</div>
          )}
          {type === "itProduct" && !productsError && (
            <div className="text-xs text-slate-600">
              {isLoadingProducts
                ? "Справочник продуктов загружается..."
                : `Доступно ${products.length} продукт(ов)`}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {type === "custom" ? (
            <label className="space-y-1 text-sm">
              <span className="text-slate-700">Название</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={titlePlaceholder}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </label>
          ) : (
            <label className="space-y-1 text-sm">
              <span className="text-slate-700">IT продукт</span>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
                disabled={isLoadingProducts}
              >
                <option value="">
                  {isLoadingProducts ? "Загрузка..." : "Выберите продукт"}
                </option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {resolveProductTitle(product) || "Без названия"}
                  </option>
                ))}
              </select>
              <div className="text-xs text-slate-600">
                {selectedProduct ? (
                  <span>
                    PO: {resolveProductOwner(selectedProduct) || "—"} • Кластер:{" "}
                    {selectedProduct.cluster || "—"}
                  </span>
                ) : (
                  <span>Название заполнится автоматически</span>
                )}
              </div>
            </label>
          )}

          <label className="space-y-1 text-sm">
            <span className="text-slate-700">Ответственный</span>
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="ФИО или команда"
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </label>

          {type === "custom" ? (
            <div className="space-y-2 text-sm">
              <div className="space-y-1">
                <span className="text-slate-700">Аудитория из справочника</span>
                <button
                  type="button"
                  onClick={() => setIsAudiencePickerOpen(true)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:border-indigo-200 hover:text-indigo-700"
                >
                  Выбрать аудиторию
                </button>
                <p className="text-xs text-slate-500">
                  {audienceId
                    ? `Выбрано: ${selectedAudienceLabel}`
                    : "Аудитория не выбрана"}
                </p>
              </div>
              <label className="space-y-1 block">
                <span className="text-slate-700">Подразделение вручную</span>
                <input
                  value={deptInput}
                  onChange={(e) => {
                    setDeptInput(e.target.value);
                    if (e.target.value) {
                      setAudienceId("");
                    }
                  }}
                  placeholder="Например: HR, Аналитика, Регион"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </label>
            </div>
          ) : (
            <label className="space-y-1 text-sm">
              <span className="text-slate-700">Подразделение</span>
              <input
                value={deptInput}
                onChange={(e) => setDeptInput(e.target.value)}
                placeholder="Например: HR, Аналитика, Регион"
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </label>
          )}

          <div className="space-y-1 text-sm">
            <span className="text-slate-700">Период опроса</span>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
                min={startDate}
              />
            </div>
            {!endDate && (
              <p className="text-xs text-amber-600">Нужна дата окончания</p>
            )}
            <button
              type="button"
              onClick={() => setShowAudienceConflicts((prev) => !prev)}
              className="text-xs text-indigo-700 underline decoration-dotted"
            >
              {showAudienceConflicts
                ? "Скрыть проверку аудиторий"
                : "Проверить пересечения по аудиториям"}
            </button>
          </div>

          {type === "itProduct" && (
            <label className="space-y-1 text-sm">
              <span className="text-slate-700">Плановая дата CSI</span>
              <input
                type="date"
                value={plannedCsiDate}
                onChange={(e) => setPlannedCsiDate(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
              {selectedProduct?.plannedCsiDate && !plannedCsiDate && (
                <p className="text-xs text-slate-500">
                  По умолчанию:{" "}
                  {new Date(selectedProduct.plannedCsiDate).toLocaleDateString(
                    "ru-RU",
                    { day: "2-digit", month: "2-digit", year: "numeric" }
                  )}
                </p>
              )}
            </label>
          )}
        </div>

        {showAudienceConflicts && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 space-y-2">
            <div className="font-medium text-slate-800">
              Пересечения по аудиториям
            </div>
            {!hasAudienceForCheck && (
              <p className="text-xs text-slate-600">
                Для проверки выберите аудиторию: укажите подразделение или
                выберите IT продукт с привязанной аудиторией.
              </p>
            )}
            {hasAudienceForCheck && audienceConflicts.length === 0 && (
              <p className="text-xs text-emerald-700">
                Пересечений на выбранный период не найдено.
              </p>
            )}
            {hasAudienceForCheck && audienceConflicts.length > 0 && (
              <div className="space-y-3">
                {audienceConflicts.map((group) => (
                  <div key={group.key} className="space-y-1">
                    <div className="text-xs font-semibold text-slate-600">
                      {group.label}
                    </div>
                    <ul className="space-y-1 text-xs text-slate-600">
                      {group.events.map((event) => {
                        const eventProduct = event.productId
                          ? products.find((product) => product.id === event.productId)
                          : undefined;
                        const displayTitle =
                          event.type === "itProduct"
                            ? resolveProductTitle(eventProduct) || event.title
                            : event.title;
                        return (
                          <li
                            key={event.id}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <span className="font-medium text-slate-800">
                              {displayTitle}
                            </span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] uppercase text-slate-500">
                              {event.type === "itProduct" ? "IT продукт" : "Польз."}
                            </span>
                            <span>
                              {formatDate(event.startDate)} —{" "}
                              {formatDate(event.endDate)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <span className="text-sm text-slate-700">Цветовая метка</span>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-2 ${
                  color === c ? "border-slate-900" : "border-white shadow"
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Выбрать цвет ${c}`}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-12 h-8 rounded-md border"
            />
          </div>
        </div>

        <label className="space-y-1 text-sm block">
          <span className="text-slate-700">Комментарий</span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Дополнительные детали, ссылки или ограничения"
            className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px]"
          />
        </label>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex justify-between gap-2 pt-2 flex-wrap">
          {isEditing && (
            <button
              onClick={remove}
              className="px-3 py-2 text-sm rounded-md border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-60"
              disabled={isSaving || isDeleting}
            >
              {isDeleting ? "Удаление..." : "Удалить"}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm rounded-md border"
            disabled={isSaving || isDeleting}
          >
            Отмена
          </button>
          <button
            onClick={save}
            className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white disabled:opacity-60"
            disabled={isSaving || isDeleting}
          >
            {isSaving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
      <AudiencePickerModal
        isOpen={isAudiencePickerOpen}
        audienceTree={audienceTree}
        selectedAudienceId={audienceId}
        onClose={() => setIsAudiencePickerOpen(false)}
        onApply={(nextAudienceId) => {
          setAudienceId(nextAudienceId);
          if (nextAudienceId) {
            setDeptInput("");
          }
          setIsAudiencePickerOpen(false);
        }}
      />
    </div>
  );
};
