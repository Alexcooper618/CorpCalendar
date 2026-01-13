"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AudiencePickerModal } from "./AudiencePickerModal";
import {
  AudienceNode,
  Event,
  EventType,
  Product,
} from "./Calendar";
import {
  buildAudienceDescendants,
  getAudienceConflicts,
} from "./utils/conflicts";

const toInputDate = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const parseInputDate = (value: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

type ConflictsModalProps = {
  isOpen: boolean;
  events: Event[];
  products: Product[];
  audienceTree: AudienceNode[];
  audienceLookup: Map<string, string>;
  onClose: () => void;
};

export const ConflictsModal = ({
  isOpen,
  events,
  products,
  audienceTree,
  audienceLookup,
  onClose,
}: ConflictsModalProps) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<EventType>>(
    new Set(["custom", "itProduct"])
  );
  const [productFilter, setProductFilter] = useState("");
  const [audienceId, setAudienceId] = useState("");
  const [deptInput, setDeptInput] = useState("");
  const [isAudiencePickerOpen, setIsAudiencePickerOpen] = useState(false);

  const defaultRange = useMemo(() => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31),
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setStartDate(toInputDate(defaultRange.start));
    setEndDate(toInputDate(defaultRange.end));
    setSelectedTypes(new Set(["custom", "itProduct"]));
    setProductFilter("");
    setAudienceId("");
    setDeptInput("");
  }, [defaultRange, isOpen]);

  const currentRange = useMemo(() => {
    const start = parseInputDate(startDate);
    const end = parseInputDate(endDate);
    if (!start || !end) return null;
    return { start, end };
  }, [endDate, startDate]);

  const audienceDescendants = useMemo(
    () => buildAudienceDescendants(audienceTree),
    [audienceTree]
  );

  const currentAudienceKeys = useMemo(() => {
    const deptValue = (audienceId || deptInput).trim();
    return deptValue ? [deptValue] : [];
  }, [audienceId, deptInput]);

  const selectedAudienceLabel = audienceId
    ? audienceLookup.get(audienceId) || audienceId
    : "";

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (!selectedTypes.has(event.type)) return false;
      if (
        event.type === "itProduct" &&
        productFilter &&
        event.productId !== productFilter
      ) {
        return false;
      }
      return true;
    });
  }, [events, productFilter, selectedTypes]);

  const audienceConflicts = useMemo(() => {
    if (!currentRange) return [];
    if (!currentAudienceKeys.length) return [];

    return getAudienceConflicts({
      events: filteredEvents,
      products,
      audienceLookup,
      audienceDescendants,
      range: currentRange,
      targetAudienceKeys: currentAudienceKeys,
    });
  }, [
    audienceDescendants,
    audienceLookup,
    currentAudienceKeys,
    currentRange,
    filteredEvents,
    products,
  ]);

  const summary = useMemo(() => {
    const eventIds = new Set<string>();
    audienceConflicts.forEach((group) => {
      group.events.forEach((event) => eventIds.add(event.id));
    });
    const sortedGroups = [...audienceConflicts].sort((a, b) => {
      if (b.events.length !== a.events.length) {
        return b.events.length - a.events.length;
      }
      return a.label.localeCompare(b.label, "ru");
    });

    return {
      totalGroups: audienceConflicts.length,
      totalEvents: eventIds.size,
      topGroups: sortedGroups.slice(0, 5),
    };
  }, [audienceConflicts]);

  const toggleType = (type: EventType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const resolveProductTitle = (product?: Product) =>
    product?.title ?? product?.name ?? "";

  const resolveEventTitle = (event: Event) => {
    if (event.type === "itProduct" && event.productId) {
      const product = products.find((p) => p.id === event.productId);
      return resolveProductTitle(product) || event.title;
    }
    return event.title;
  };

  const resolveDeptLabel = (dept?: string) => {
    if (!dept) return "";
    return audienceLookup.get(dept) ?? dept;
  };

  const makeAnchorId = (key: string) => `audience-${encodeURIComponent(key)}`;

  const handleAudienceApply = (selectedId: string) => {
    setAudienceId(selectedId);
    setDeptInput("");
    setIsAudiencePickerOpen(false);
  };

  const handleDeptChange = (value: string) => {
    setDeptInput(value);
    if (value.trim()) {
      setAudienceId("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-5xl flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">Общий обзор</p>
            <h3 className="text-lg font-semibold text-slate-900">
              Проверка пересечений
            </h3>
            <p className="text-xs text-slate-500">
              Настройте период, аудиторию и фильтры, чтобы увидеть пересечения
              событий в календаре.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 text-sm"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="space-y-1 text-sm">
              <span className="text-slate-700">Период проверки</span>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  min={startDate}
                />
              </div>
            </div>

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
                  onChange={(e) => handleDeptChange(e.target.value)}
                  placeholder="Например: HR, Аналитика, Регион"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <span className="text-slate-700">Типы событий</span>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedTypes.has("custom")}
                    onChange={() => toggleType("custom")}
                  />
                  <span>Пользовательские</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedTypes.has("itProduct")}
                    onChange={() => toggleType("itProduct")}
                  />
                  <span>IT продукты</span>
                </label>
              </div>
              {!selectedTypes.size && (
                <p className="text-xs text-amber-600">
                  Выберите хотя бы один тип событий.
                </p>
              )}
            </div>

            <label className="space-y-1 text-sm block">
              <span className="text-slate-700">Фильтр по IT продукту</span>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                disabled={!selectedTypes.has("itProduct")}
              >
                <option value="">Все IT продукты</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {resolveProductTitle(product) || product.id}
                  </option>
                ))}
              </select>
              {!selectedTypes.has("itProduct") && (
                <p className="text-xs text-slate-500">
                  Фильтр активен только при выборе IT продуктов.
                </p>
              )}
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">Сводка</p>
              <p className="text-sm text-slate-800 font-semibold">
                {summary.totalGroups} групп(ы) пересечений • {summary.totalEvents}
                {" "}событий
              </p>
              {currentRange && (
                <p className="text-xs text-slate-500">
                  Период: {formatDate(startDate)} — {formatDate(endDate)}
                </p>
              )}
            </div>
            {summary.topGroups.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                {summary.topGroups.map((group) => (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => {
                      const anchor = document.getElementById(makeAnchorId(group.key));
                      anchor?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="rounded-full border bg-white px-3 py-1 text-slate-700 hover:border-indigo-200 hover:text-indigo-700"
                  >
                    {group.label} • {group.events.length}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!currentAudienceKeys.length && (
            <p className="mt-2 text-xs text-slate-500">
              Для проверки выберите аудиторию: укажите подразделение вручную или
              выберите аудиторию из справочника.
            </p>
          )}
          {!currentRange && (
            <p className="mt-2 text-xs text-amber-600">
              Укажите корректный период проверки.
            </p>
          )}
        </div>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {currentAudienceKeys.length > 0 &&
            currentRange &&
            audienceConflicts.length === 0 && (
            <div className="text-xs text-emerald-700">
              Пересечений на выбранный период не найдено.
            </div>
          )}

          {audienceConflicts.map((group) => (
            <div
              key={group.key}
              id={makeAnchorId(group.key)}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-500">Аудитория</p>
                  <h4 className="text-sm font-semibold text-slate-800">
                    {group.label}
                  </h4>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                  {group.events.length} пересечений
                </span>
              </div>

              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                {group.events.map((event) => {
                  const displayTitle = resolveEventTitle(event);
                  const typeLabel =
                    event.type === "itProduct" ? "IT продукт" : "Пользовательский";
                  const product =
                    event.type === "itProduct"
                      ? products.find((p) => p.id === event.productId)
                      : undefined;
                  const plannedDate = event.plannedCsiDate ?? product?.plannedCsiDate;
                  const plannedDateLabel = plannedDate ? formatDate(plannedDate) : "";

                  return (
                    <li key={event.id} className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-800">
                        {displayTitle}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase text-slate-500">
                        {typeLabel}
                      </span>
                      <span>
                        {formatDate(event.startDate)} — {formatDate(event.endDate)}
                      </span>
                      {event.dept && (
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-500 border">
                          {resolveDeptLabel(event.dept)}
                        </span>
                      )}
                      {plannedDateLabel && (
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-500 border">
                          План CSI: {plannedDateLabel}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <AudiencePickerModal
        isOpen={isAudiencePickerOpen}
        audienceTree={audienceTree}
        selectedAudienceId={audienceId}
        onApply={handleAudienceApply}
        onClose={() => setIsAudiencePickerOpen(false)}
      />
    </div>
  );
};
