import { Calendar } from "./components/Calendar";

export default function Page() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Планирование CSI и опросов
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Календарь планирования CSI, Happy Job и других корпоративных опросов.
          Поддерживает режимы отображения, подсветки периодов и разные типы опросов.
        </p>
      </div>

      <Calendar />
    </main>
  );
}
