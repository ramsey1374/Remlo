"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ToastType = "success" | "error" | "info" | "warning";

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextType = {
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const icons: Record<ToastType, string> = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };

  const colors: Record<ToastType, string> = {
    success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    error: "bg-red-500/10 border-red-500/20 text-red-400",
    warning: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    info: "bg-indigo-500/10 border-indigo-500/20 text-indigo-300",
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[999] flex flex-col gap-2 max-w-sm w-full px-4 md:px-0">
        {toasts.map((t) => (
          <div key={t.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm animate-in slide-in-from-right-4 ${colors[t.type]}`}
            style={{ animation: "slideIn 0.2s ease" }}>
            <span className="flex-shrink-0 font-bold text-sm">{icons[t.type]}</span>
            <span className="text-sm leading-relaxed">{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="ml-auto flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity text-xs">
              ✕
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
