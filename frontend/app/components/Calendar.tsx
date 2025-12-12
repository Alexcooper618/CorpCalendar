"use client";

import React, { useEffect, useMemo, useState } from "react";
import { EventModal } from "./EventModal";

type EventType = "fin" | "care" | "corp";

type Event = {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  dept?: EventType;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const EVENT_COLORS: Record<EventType, string> = {
  fin: "bg-blue-100 text-blue-800",
  care: "bg-green-100 text-green-800",
  corp: "bg-purple-100 text-purple-800",
};

const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function getMonthDays(year: number, month: number) {
  const date = new Date(year, month, 1);
  const days: Date[] = [];

  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export const Calendar: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [mode, setMode] = useState<"period" | "start">("period");

  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(0);

  const todayKey = new Date().toISOString().slice(0, 10);

  const fetchEvents = async () => {
    const res = await fetch(`${API_URL}/api/events`);
    const data = await res.json();
    setEvents(data);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const days = useMemo(
    () => getMonthDays(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  const offset =
    (days[0]?.getDay() === 0 ? 7 : days[0]?.getDay()) - 1;

  const monthTitle = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(new Date(currentYear, currentMonth, 1));

  const nextMonth = () => {
    setCurrentMonth((m) => (m + 1) % 12);
    if (currentMonth === 11) setCurrentYear((y) => y + 1);
  };

  const prevMonth = () => {
    setCurrentMonth((m) => (m + 11) % 12);
    if (currentMonth === 0) setCurrentYear((y) => y - 1);
  };

  const getEventsForDay = (day: Date) => {
    const key = day.toISOString().slice(0, 10);

    return events.filter((e) => {
      const start = e.startDate.slice(0, 10);
      const end = e.endDate.slice(0, 10);
      return mode === "period"
        ? key >= start && key <= end
        : key === start;
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow border border-slate-200 p-4 overflow-x-auto">
      <div className="min-w-[1000px]">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="px-2 py-1 rounded hover:bg-slate-100"
            >
              ←
            </button>
            <button
              onClick={nextMonth}
              className="px-2 py-1 rounded hover:bg-slate-100"
            >
              →
            </button>
            <h2 className="ml-2 text-lg font-semibold capitalize">
              {monthTitle}
            </h2>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              className={`px-3 py-1 text-sm rounded-md ${
                mode === "period"
                  ? "bg-white shadow"
                  : "text-slate-500"
              }`}
              onClick={() => setMode("period")}
            >
              Период
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-md ${
                mode === "start"
                  ? "bg-white shadow"
                  : "text-slate-500"
              }`}
              onClick={() => setMode("start")}
            >
              Дата рассылки
            </button>
          </div>
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 text-xs text-slate-500 mb-1">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="text-center py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden">
          {Array.from({ length: offset }).map((_, i) => (
            <div key={i} className="bg-slate-50 min-h-[110px]" />
          ))}

          {days.map((day) => {
            const key = day.toISOString().slice(0, 10);
            const dayEvents = getEventsForDay(day);
            const isToday = key === todayKey;
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

            return (
              <div
                key={key}
                onClick={() => setSelectedDate(day)}
                className={`bg-white min-h-[110px] p-1 cursor-pointer hover:bg-blue-50 transition
                  ${isWeekend ? "bg-slate-50" : ""}
                `}
              >
                <div className="flex justify-between items-center text-xs mb-1">
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
                    <div
                      key={ev.id}
                      className={`truncate rounded-full px-2 py-0.5 text-[10px] ${
                        EVENT_COLORS[ev.dept || "fin"]
                      }`}
                    >
                      {ev.title}
                    </div>
                  ))}

                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-slate-400">
                      + ещё {dayEvents.length - 3}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <EventModal
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
          onSaved={fetchEvents}
        />
      )}
    </div>
  );
};
