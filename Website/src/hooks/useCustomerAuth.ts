import { useState, useEffect, useCallback } from "react";

export interface CustomerUser {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  gender?: string | null;
  dob?: string | null;
  loyalty_points?: number;
  total_spend?: string | number;
  total_visits?: number;
  credit_balance?: string | number;
  status?: string;
}

const TOKEN_KEY = "glowy_customer_token";
const USER_KEY = "glowy_customer_user";

const API_BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:5001/api";

export function useCustomerAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Error reading stored customer auth:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSession = useCallback((newToken: string, newUser: CustomerUser) => {
    try {
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    } catch (e) {
      console.error("Failed to persist customer auth:", e);
    }
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
    } catch (e) {
      console.error("Failed to clear customer auth:", e);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const activeToken = token || localStorage.getItem(TOKEN_KEY);
    if (!activeToken) return null;

    try {
      const res = await fetch(`${API_BASE}/customers/portal/me`, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          logout();
        }
        return null;
      }

      const data = await res.json();
      if (data.success && data.customer) {
        setUser(data.customer);
        localStorage.setItem(USER_KEY, JSON.stringify(data.customer));
        return data.customer;
      }
    } catch (err) {
      console.error("Error refreshing customer profile:", err);
    }
    return null;
  }, [token, logout]);

  const loginWithPhone = useCallback(
    async (phone: string): Promise<{ exists: boolean; message?: string; error?: string }> => {
      try {
        const res = await fetch(`${API_BASE}/customers/portal/auth/phone-login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ phone }),
        });

        const data = await res.json();

        if (!res.ok) {
          return { exists: false, error: data.message || "Failed to log in." };
        }

        if (data.exists && data.token && data.customer) {
          saveSession(data.token, data.customer);
          return { exists: true };
        }

        return { exists: false, message: data.message };
      } catch (err: any) {
        return { exists: false, error: err.message || "Network error. Please try again." };
      }
    },
    [saveSession]
  );

  const registerWithPhone = useCallback(
    async (
      phone: string,
      name: string,
      email?: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch(`${API_BASE}/customers/portal/auth/phone-register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ phone, name, email }),
        });

        const data = await res.json();

        if (!res.ok) {
          return { success: false, error: data.message || "Failed to create customer profile." };
        }

        if (data.token && data.customer) {
          saveSession(data.token, data.customer);
          return { success: true };
        }

        return { success: false, error: "Unexpected server response." };
      } catch (err: any) {
        return { success: false, error: err.message || "Network error during registration." };
      }
    },
    [saveSession]
  );

  return {
    token,
    user,
    isAuthenticated: Boolean(token && user),
    isLoading,
    loginWithPhone,
    registerWithPhone,
    logout,
    refreshProfile,
  };
}
