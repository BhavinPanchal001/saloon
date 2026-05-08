import { useToastStore } from "../../stores/toastStore";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";

/**
 * Toast Container Component
 * Displays toast notifications at the top-right of the screen
 * Includes animations and auto-dismiss functionality
 */

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastStyles = {
  success: "bg-emerald-500 text-white shadow-emerald-500/30",
  error: "bg-rose-500 text-white shadow-rose-500/30",
  warning: "bg-amber-500 text-white shadow-amber-500/30",
  info: "bg-navy-500 text-white shadow-navy-500/30",
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3">
      {toasts.map((toast) => {
        const Icon = toastIcons[toast.type];
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 rounded-2xl px-5 py-4 shadow-lg backdrop-blur-sm animate-premium-in ${toastStyles[toast.type]}`}
            role="alert"
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 flex-shrink-0 rounded-lg p-1 hover:bg-white/20 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
