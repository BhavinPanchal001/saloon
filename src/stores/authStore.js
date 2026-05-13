import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getDefaultRouteForRole } from "../utils/format";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      loginError: null,
      login: async (credentials) => {
        set({ isLoading: true, loginError: null });

        try {
          const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.message || "Unable to sign in.");
          }

          const user = { ...data.admin, token: data.token };

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            loginError: null,
          });

          return { user, redirectTo: getDefaultRouteForRole(user.role) };
        } catch (error) {
          set({
            isLoading: false,
            loginError: error.message || "Unable to sign in.",
          });
          throw error;
        }
      },
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          loginError: null,
        }),
      clearLoginError: () => set({ loginError: null }),
    }),
    {
      name: "glowy-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
