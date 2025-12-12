import "../styles/globals.css";
import React from "react";

export const metadata = {
  title: "CSI Calendar",
  description: "Планирование CSI и опросов",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-slate-100 text-slate-900">
        <div className="max-w-[1400px] mx-auto px-4 py-6">
          {children}
        </div>
      </body>
    </html>
  );
}
