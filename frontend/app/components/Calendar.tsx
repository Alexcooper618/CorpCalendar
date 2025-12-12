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
  return new Set(HOLIDAY_MONTH_DAYS.map((md) => `${year}-${md}`));
}

function normalizeDate(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export const Calendar: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Date | null>(null);
  const [hasDragged, setHasDragged] = useState(false);
  const [rangeForModal, setRangeForModal] = useState<{
    start: Date;
    end?: Date;
    event?: Event;
  } | null>(null);

  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const todayKey = new Date().toISOString().slice(0, 10);
  const holidays = useMemo(() => buildHolidaySet(currentYear), [currentYear]);

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
    const key = day.toISOString().slice(0, 10);

    return events.filter((e) => {
      const start = e.startDate.slice(0, 10);
      const end = e.endDate.slice(0, 10);
      return key >= start && key <= end;
    });
  };

  const isInSelection = (day: Date) => {
    if (!selectionStart) return false;
    const start = normalizeDate(selectionStart);
    const end = normalizeDate(selectionEnd || selectionStart);
    const date = normalizeDate(day);

    const [min, max] = start <= end ? [start, end] : [end, start];
    return date >= min && date <= max;
  };

  const handleMouseDown = (day: Date) => {
    setSelectionStart(day);
    setSelectionEnd(day);
    setHasDragged(false);
  };

  const handleMouseEnter = (day: Date) => {
    if (selectionStart) {
      setSelectionEnd(day);
      if (normalizeDate(day).getTime() !== normalizeDate(selectionStart).getTime()) {
        setHasDragged(true);
      }
    }
  };

  const handleMouseUp = (day: Date) => {
    if (!selectionStart) return;

    const start = normalizeDate(selectionStart);
    const end = normalizeDate(day);
    setRangeForModal({ start, end: hasDragged ? end : undefined });

    setSelectionStart(null);
    setSelectionEnd(null);
    setHasDragged(false);
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
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <span className="px-1 rounded bg-amber-50 border border-amber-200" />
                    <span>Праздники</span>
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
                    const key = day.toISOString().slice(0, 10);
                    const dayEvents = getEventsForDay(day);
                    const isToday = key === todayKey;
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    const isHoliday = holidays.has(key);
                    const selected = isInSelection(day);

                    return (
                      <div
                        key={key}
                        onMouseDown={() => handleMouseDown(day)}
                        onMouseEnter={() => handleMouseEnter(day)}
                        onMouseUp={() => handleMouseUp(day)}
                        className={`bg-white min-h-[80px] p-1 cursor-pointer transition relative
                          ${isWeekend ? "bg-slate-50" : ""}
                          ${isHoliday ? "bg-amber-50" : ""}
                          ${selected ? "ring-2 ring-blue-400" : ""}
                        `}
                      >
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span
                            className={`px-1 rounded ${
                              isToday
                                ? "bg-blue-600 text-white"
                                : "text-slate-700"
                            }`}
                          >
                            {day.getDate()}
                          </span>
                        </div>

                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((ev) => (
                            <button
                              key={ev.id}
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                setRangeForModal({
                                  start: new Date(ev.startDate),
                                  end: new Date(ev.endDate),
                                  event: ev,
                                });
                              }}
                              className="w-full text-left truncate rounded-full px-1.5 py-0.5 text-[10px] text-slate-800 border hover:ring-2 hover:ring-blue-300"
                              style={{
                                backgroundColor: ev.color || "#e0f2fe",
                                borderColor: ev.color || "#bae6fd",
                              }}
                              title={`${ev.title}${ev.dept ? ` • ${ev.dept}` : ""}`}
                            >
                              {ev.title}
                            </button>
                          ))}
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
