"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Календарь CSI" },
  { href: "/it", label: "ИТ продукты" },
];

export function PageTabs() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/60 p-3 shadow-sm ring-1 ring-slate-200"
      aria-label="Основные разделы"
    >
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href !== "/" && pathname.startsWith(tab.href));

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm"
                  : "border-transparent text-slate-600 hover:border-indigo-100 hover:bg-indigo-50/80 hover:text-indigo-700"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <div className="text-xs font-medium text-slate-500">
        Переключайтесь между календарём опросов и разделом IT-продуктов
      </div>
    </nav>
  );
}
