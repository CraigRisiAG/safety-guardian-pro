import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

export const useAuthFetch = () => {
  const { user } = useAuth();

  const authFetch = useCallback(
    async (url: string, options: FetchOptions = {}) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...options.headers,
      };

      // Add auth token if user is logged in
      if (user) {
        const token = localStorage.getItem("auth_token");
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          localStorage.removeItem("auth_user");
          localStorage.removeItem("auth_token");
          window.location.href = "/login";
        }
        throw new Error(`API Error: ${response.statusText}`);
      }

      return response.json();
    },
    [user]
  );

  return authFetch;
};
