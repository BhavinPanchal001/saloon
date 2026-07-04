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
      pendingEmail: null,
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

          if (data.requires2FA) {
            set({ isLoading: false, loginError: null, pendingEmail: data.email });
            return { requires2FA: true, email: data.email, twoFaMethod: data.twoFaMethod, redirectTo: "/verify-otp" };
          }

          const user = { ...data.admin, token: data.token };

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            loginError: null,
            pendingEmail: null,
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
      verifyOTP: async ({ email, otp }) => {
        set({ isLoading: true, loginError: null });

        try {
          const res = await fetch(`${API_BASE}/auth/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp }),
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.message || "Verification failed.");
          }

          const user = { ...data.admin, token: data.token };

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            loginError: null,
            pendingEmail: null,
          });

          return { user, redirectTo: getDefaultRouteForRole(user.role) };
        } catch (error) {
          set({
            isLoading: false,
            loginError: error.message || "Verification failed.",
          });
          throw error;
        }
      },
      resendOTP: async (email) => {
        const res = await fetch(`${API_BASE}/auth/resend-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Could not resend code.");
        }

        return data;
      },
      setupTOTP: async () => {
        const { user } = useAuthStore.getState();
        const res = await fetch(`${API_BASE}/auth/totp/setup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user?.token}`,
          },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Setup failed.");
        return data;
      },
      confirmTOTP: async (token) => {
        const { user } = useAuthStore.getState();
        const res = await fetch(`${API_BASE}/auth/totp/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user?.token}`,
          },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Confirmation failed.");
        
        // Update local user state
        set({ user: { ...user, totp_enabled: true } });
        
        return data;
      },
      disableTOTP: async (password) => {
        const { user } = useAuthStore.getState();
        const res = await fetch(`${API_BASE}/auth/totp/disable`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user?.token}`,
          },
          body: JSON.stringify({ password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Could not disable authenticator.");
        
        // Update local user state
        set({ user: { ...user, totp_enabled: false } });
        
        return data;
      },
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          loginError: null,
          pendingEmail: null,
        }),
      clearLoginError: () => set({ loginError: null }),
    }),
    {
      name: "glowy-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        pendingEmail: state.pendingEmail,
      }),
    },
  ),
);
