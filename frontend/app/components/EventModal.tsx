"use client";

import React, { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const EventModal = ({
  date,
  onClose,
  onSaved,
}: {
  date: Date;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [title, setTitle] = useState("");
  const [days, setDays] = useState(0);
  const [dept, setDept] = useState("fin");

  const save = async () => {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + days);

    await fetch(`${API_URL}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || "Новый опрос",
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        dept,
      }),
    });

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
        <h3 className="font-semibold mb-4">
          Новый опрос — {date.toLocaleDateString()}
        </h3>

        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название опроса"
            className="w-full border rounded-md px-3 py-2 text-sm"
          />

          <select
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
          >
            <option value="fin">Финансы</option>
            <option value="care">Забота</option>
            <option value="corp">Корпоративный</option>
          </select>

          <input
            type="number"
            value={days}
            min={0}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-24 border rounded-md px-2 py-1 text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-md border"
          >
            Отмена
          </button>
          <button
            onClick={save}
            className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white"
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  );
};
