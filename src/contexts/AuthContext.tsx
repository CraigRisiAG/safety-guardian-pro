import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("auth_user");
    const storedToken = localStorage.getItem("auth_token");
    
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem("auth_user");
        localStorage.removeItem("auth_token");
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      // Simulate API call - Replace with real backend API
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Validation
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      // Mock login - In production, this would call your backend
      const mockUser: User = {
        id: `user_${Date.now()}`,
        email,
        name: email.split("@")[0],
        role: "user",
      };

      const mockToken = `token_${Date.now()}_${Math.random()}`;

      // Store in localStorage
      localStorage.setItem("auth_user", JSON.stringify(mockUser));
      localStorage.setItem("auth_token", mockToken);

      setUser(mockUser);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string): Promise<void> => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Validation
      if (!email || !password || !name) {
        throw new Error("Email, password, and name are required");
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Invalid email format");
      }

      // Mock registration - In production, this would call your backend
      const mockUser: User = {
        id: `user_${Date.now()}`,
        email,
        name,
        role: "user",
      };

      const mockToken = `token_${Date.now()}_${Math.random()}`;

      // Store in localStorage
      localStorage.setItem("auth_user", JSON.stringify(mockUser));
      localStorage.setItem("auth_token", mockToken);

      setUser(mockUser);
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
