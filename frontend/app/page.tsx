import { Calendar } from "./components/Calendar";

export default function Page() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Планирование CSI и опросов
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Годовой календарь для координации CSI, Happy Job и других корпоративных
          опросов. Позволяет выделять периоды, указывать ответственных и
          подразделения, добавлять цветовые метки и комментарии, чтобы команды
          видели пересечения и нагрузку.
        </p>
      </div>

      <Calendar />
    </main>
  );
}
