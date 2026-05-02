import { create } from "zustand";
import { persist } from "zustand/middleware";
import { loginUser } from "../services/mockApi";
import { getDefaultRouteForRole } from "../utils/format";

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
          const user = await loginUser(credentials);
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
