import { create } from "zustand";

/**
 * Toast Notification Store
 * Replaces native alert() and console-only error handling
 * with user-visible toast notifications
 */

let toastIdCounter = 0;

export const useToastStore = create((set, get) => ({
  toasts: [],

  // Add a new toast
  addToast: (message, type = "info", duration = 4000) => {
    const id = ++toastIdCounter;
    const toast = {
      id,
      message,
      type,
      duration,
    };

    set((state) => ({ toasts: [...state.toasts, toast] }));

    // Auto-remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }

    return id;
  },

  // Remove a toast by ID
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  // Convenience methods
  success: (message, duration) => get().addToast(message, "success", duration),
  error: (message, duration) => get().addToast(message, "error", duration),
  warning: (message, duration) => get().addToast(message, "warning", duration),
  info: (message, duration) => get().addToast(message, "info", duration),
}));
