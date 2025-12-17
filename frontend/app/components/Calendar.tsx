"use client";

import React, { useEffect, useMemo, useState } from "react";
import { buildApiUrl } from "../lib/api";
import { EventModal } from "./EventModal";

export type Event = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  dept?: string;
  owner?: string;
  color?: string;
  comment?: string;
};

const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const HOLIDAY_MONTH_DAYS = [
  "01-01",
  "01-02",
  "01-03",
  "01-04",
  "01-05",
  "01-06",
  "01-07",
  "01-08",
  "02-23",
  "03-08",
  "05-01",
  "05-09",
  "06-12",
  "11-04",
];

const PRODUCTION_CALENDAR: Record<number, string[]> = {
  2025: [
    "2025-01-01",
    "2025-01-02",
    "2025-01-03",
    "2025-01-04",
    "2025-01-05",
    "2025-01-06",
    "2025-01-07",
    "2025-01-08",
    "2025-02-23",
    "2025-02-24",
    "2025-03-08",
    "2025-03-10",
    "2025-05-01",
    "2025-05-09",
    "2025-06-12",
    "2025-11-04",
  ],
  2026: [
    "2026-01-01",
    "2026-01-02",
    "2026-01-03",
    "2026-01-04",
    "2026-01-05",
    "2026-01-06",
    "2026-01-07",
    "2026-01-08",
    "2026-02-23",
    "2026-03-08",
    "2026-03-09",
    "2026-05-01",
    "2026-05-09",
    "2026-05-11",
    "2026-06-12",
    "2026-11-04",
  ],
};

function getMonthDays(year: number, month: number) {
  const date = new Date(year, month, 1);
  const days: Date[] = [];

  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function buildHolidaySet(year: number) {
  const productionDays = PRODUCTION_CALENDAR[year];

  if (productionDays) {
    return new Set(productionDays);
  }

  return new Set(HOLIDAY_MONTH_DAYS.map((md) => `${year}-${md}`));
}

function normalizeDate(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export const Calendar: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [rangeForModal, setRangeForModal] = useState<{
    start: Date;
    end?: Date;
    event?: Event;
  } | null>(null);
  const [dayDetailsDate, setDayDetailsDate] = useState<Date | null>(null);

  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const todayKey = formatDateKey(new Date());
  const productionDayOffs = useMemo(() => buildHolidaySet(currentYear), [currentYear]);

  const fetchEvents = async () => {
    try {
      const res = await fetch(buildApiUrl("/api/events"));
      if (!res.ok) {
        throw new Error("Не удалось загрузить события");
      }

      const data = await res.json();
      setEvents(data);
    } catch (error) {
      console.error("Failed to load events", error);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const months = useMemo(() => Array.from({ length: 12 }, (_, m) => m), []);

  const getEventsForDay = (day: Date) => {
    const key = formatDateKey(day);

    return events.filter((e) => {
      const start = formatDateKey(new Date(e.startDate));
      const end = formatDateKey(new Date(e.endDate));
      return key >= start && key <= end;
    });
  };

  const handleDayCellClick = (day: Date, dayEvents: Event[]) => {
    if (dayEvents.length > 0) {
      setDayDetailsDate(day);
      return;
    }

    const normalizedDay = normalizeDate(day);
    setRangeForModal({ start: normalizedDay, end: normalizedDay });
  };

  const monthTitle = (month: number) =>
    new Intl.DateTimeFormat("ru-RU", { month: "long" }).format(
      new Date(currentYear, month, 1)
    );

  return (
    <div className="bg-white rounded-2xl shadow border border-slate-200 p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Годовой обзор</p>
            <h2 className="text-2xl font-semibold">{currentYear}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentYear((y) => y - 1)}
              className="px-3 py-1.5 rounded-lg border text-sm hover:bg-slate-50"
            >
              ← Предыдущий
            </button>
            <button
              onClick={() => setCurrentYear((y) => y + 1)}
              className="px-3 py-1.5 rounded-lg border text-sm hover:bg-slate-50"
            >
              Следующий →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {months.map((month) => {
            const days = getMonthDays(currentYear, month);
            const offset = (days[0]?.getDay() === 0 ? 7 : days[0]?.getDay()) - 1;

            return (
              <div
                key={month}
                className="border border-slate-200 rounded-xl p-3 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold capitalize">
                    {monthTitle(month)}
                  </h3>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <span className="px-1 rounded bg-slate-100 border border-slate-300" />
                      <span>Выходные</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="px-1 rounded bg-amber-100 border border-amber-300" />
                      <span>Праздники / переносы</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-7 text-[11px] text-slate-500 mb-1">
                  {WEEK_DAYS.map((d) => (
                    <div key={d} className="text-center py-1">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden select-none">
                  {Array.from({ length: offset }).map((_, i) => (
                    <div key={`empty-${i}`} className="bg-slate-50 min-h-[80px]" />
                  ))}

                  {days.map((day) => {
                    const key = formatDateKey(day);
                    const dayEvents = getEventsForDay(day);
                    const isToday = key === todayKey;
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    const isProductionDayOff = productionDayOffs.has(key);

                    const dayCellClasses = [
                      "min-h-[80px]",
                      "p-1",
                      "cursor-pointer",
                      "transition",
                      "relative",
                      "border",
                      "bg-white",
                      "border-slate-100",
                    ];

                    if (isWeekend) {
                      dayCellClasses.push("bg-slate-50", "border-slate-200");
                    }

                    if (isProductionDayOff) {
                      dayCellClasses.push("bg-amber-50", "border-amber-200");
                    }

                    const dayNumberClasses = ["px-1", "rounded", "text-slate-700"];

                    if (isWeekend && !isProductionDayOff && !isToday) {
                      dayNumberClasses.push("text-slate-500", "font-medium");
                    }

                    if (isProductionDayOff && !isToday) {
                      dayNumberClasses.push("bg-amber-100", "text-amber-800", "font-semibold");
                    }

                    if (isToday) {
                      dayNumberClasses.push("bg-blue-600", "text-white");
                    }

                    return (
                      <div
                        key={key}
                        onClick={() => handleDayCellClick(day, dayEvents)}
                        className={dayCellClasses.join(" ")}
                      >
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className={dayNumberClasses.join(" ")}>
                            {day.getDate()}
                          </span>
                        </div>

                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((ev) => {
                            const startKey = formatDateKey(new Date(ev.startDate));
                            const isStartDay = key === startKey;

                            return (
                              <div
                                key={ev.id}
                                className="w-full text-left truncate rounded-full px-1.5 py-0.5 text-[10px] text-slate-800 border"
                                style={{
                                  backgroundColor: ev.color || "#e0f2fe",
                                  borderColor: ev.color || "#bae6fd",
                                  opacity: isStartDay ? 1 : 0.5,
                                }}
                                title={`${ev.title}${ev.dept ? ` • ${ev.dept}` : ""}`}
                                aria-hidden
                              >
                                {ev.title}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {dayDetailsDate && (
        <DayDetailsModal
          date={dayDetailsDate}
          events={getEventsForDay(dayDetailsDate)}
          onClose={() => setDayDetailsDate(null)}
          onAdd={() =>
            setRangeForModal({
              start: normalizeDate(dayDetailsDate),
              end: normalizeDate(dayDetailsDate),
            })
          }
          onEdit={(event) =>
            setRangeForModal({
              start: new Date(event.startDate),
              end: new Date(event.endDate),
              event,
            })
          }
          onDeleted={fetchEvents}
        />
      )}

      {rangeForModal && (
        <EventModal
          range={rangeForModal}
          onClose={() => setRangeForModal(null)}
          onSaved={() => {
            fetchEvents();
            setRangeForModal(null);
          }}
        />
      )}
    </div>
  );
};

const DayDetailsModal = ({
  date,
  events,
  onClose,
  onAdd,
  onEdit,
  onDeleted,
}: {
  date: Date;
  events: Event[];
  onClose: () => void;
  onAdd: () => void;
  onEdit: (event: Event) => void;
  onDeleted: () => void;
}) => {
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const formattedDate = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);

  const handleDelete = async (event: Event) => {
    const confirmed = window.confirm("Удалить этот опрос?");
    if (!confirmed) return;

    setError("");
    setIsDeletingId(event.id);

    try {
      const response = await fetch(buildApiUrl(`/api/events/${event.id}`), {
        method: "DELETE",
      });

      if (!response.ok) {
        const message = await response
          .json()
          .then((data) => data.message)
          .catch(() => undefined);

        throw new Error(message || "Не удалось удалить событие");
      }

      onDeleted();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Не удалось удалить событие";
      setError(message);
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">События дня</p>
            <h3 className="font-semibold text-lg">{formattedDate}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 text-sm"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <div className="flex justify-between items-center gap-3">
          <div className="text-sm text-slate-700">
            {events.length ? `${events.length} событие(й)` : "Нет событий"}
          </div>
          <button
            onClick={onAdd}
            className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white"
          >
            Добавить событие
          </button>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {events.length === 0 && (
            <div className="text-sm text-slate-500">В этот день пока нет событий.</div>
          )}

          {events.map((event) => (
            <div
              key={event.id}
              className="border rounded-lg p-3 flex flex-col gap-2 bg-slate-50"
              style={{ borderColor: event.color || "#e2e8f0" }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full border"
                    style={{
                      backgroundColor: event.color || "#e0f2fe",
                      borderColor: event.color || "#bae6fd",
                    }}
                  />
                  <div className="font-semibold text-sm truncate" title={event.title}>
                    {event.title}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="text-xs text-blue-700 hover:underline"
                    onClick={() => onEdit(event)}
                  >
                    Редактировать
                  </button>
                  <button
                    className="text-xs text-red-700 hover:underline disabled:opacity-60"
                    onClick={() => handleDelete(event)}
                    disabled={isDeletingId === event.id}
                  >
                    {isDeletingId === event.id ? "Удаление..." : "Удалить"}
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                {(event.dept || event.owner) && (
                  <div className="flex flex-wrap gap-2">
                    {event.dept && (
                      <span className="px-2 py-0.5 rounded-full bg-white border text-slate-700">
                        {event.dept}
                      </span>
                    )}
                    {event.owner && (
                      <span className="px-2 py-0.5 rounded-full bg-white border text-slate-700">
                        {event.owner}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="font-medium">Период:</span>
                  <span>
                    {new Date(event.startDate).toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                    {" — "}
                    {new Date(event.endDate).toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                </div>

                {event.comment && <div>Комментарий: {event.comment}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
