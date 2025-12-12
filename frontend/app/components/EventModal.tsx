"use client";

import React, { useMemo, useState } from "react";
import { Event } from "./Calendar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
  return date.toISOString().slice(0, 10);
}

export const EventModal = ({
  range,
  onClose,
  onSaved,
}: {
  range: { start: Date; end?: Date };
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [title, setTitle] = useState("");
  const [dept, setDept] = useState("");
  const [owner, setOwner] = useState("");
  const [startDate, setStartDate] = useState(toInputDate(range.start));
  const [endDate, setEndDate] = useState(range.end ? toInputDate(range.end) : "");
  const [color, setColor] = useState(PALETTE[0]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  const save = async () => {
    if (!endDate) {
      setError("Укажите дату окончания опроса");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      setError("Дата окончания раньше даты начала");
      return;
    }

    setError("");
    setIsSaving(true);

    await fetch(`${API_URL}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || titlePlaceholder,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        dept: dept || undefined,
        owner: owner || undefined,
        color,
        comment: comment || undefined,
      } satisfies Partial<Event>),
    });

    setIsSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">Новый опрос</p>
            <h3 className="font-semibold text-lg">{title || titlePlaceholder}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 text-sm"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1 text-sm">
            <span className="text-slate-700">Название</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={titlePlaceholder}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-slate-700">Ответственный</span>
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="ФИО или команда"
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-slate-700">Подразделение</span>
            <input
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              placeholder="Например: HR, Аналитика, Регион"
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </label>

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
          </div>
        </div>

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

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm rounded-md border"
            disabled={isSaving}
          >
            Отмена
          </button>
          <button
            onClick={save}
            className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white disabled:opacity-60"
            disabled={isSaving}
          >
            {isSaving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
};
