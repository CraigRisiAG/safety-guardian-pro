import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { logAuditEvent } from "@/lib/auditLog";
import { DEFAULT_SUPPORTED_LANGUAGES, SystemLanguage } from "@/types/admin";
import {
  clearMfaChallengeForUser,
  issueMfaChallenge,
  verifyMfaChallenge,
} from "@/lib/mfaTooling";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  preferredLanguage?: SystemLanguage;
  mfaEnabled?: boolean;
  isImpersonating?: boolean;
  impersonatedByName?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isImpersonating: boolean;
  canAdministerUsers: boolean;
  systemUsers: User[];
  login: (email: string, password: string, mfaCode?: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<User>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  resetUserPassword: (userId: string, newPassword: string) => Promise<void>;
  setCurrentUserMfaEnabled: (enabled: boolean) => Promise<void>;
  setUserMfaEnabled: (userId: string, enabled: boolean) => Promise<void>;
  setCurrentUserLanguagePreference: (language: SystemLanguage) => Promise<void>;
  impersonateUser: (userId: string) => void;
  stopImpersonation: () => void;
}

interface AuthAccount {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  preferredLanguage: SystemLanguage;
  mfaEnabled: boolean;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthSession {
  currentUserId: string;
  impersonatorUserId?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCOUNTS_STORAGE_KEY = "auth_accounts";
const SESSION_STORAGE_KEY = "auth_session";
const USER_STORAGE_KEY = "auth_user";
const TOKEN_STORAGE_KEY = "auth_token";
const VALID_LANGUAGES = new Set<SystemLanguage>(DEFAULT_SUPPORTED_LANGUAGES);

const normalizeLanguage = (value: unknown): SystemLanguage => {
  if (typeof value === "string" && VALID_LANGUAGES.has(value as SystemLanguage)) {
    return value as SystemLanguage;
  }

  return "english";
};

const DEFAULT_ACCOUNTS_SEED = [
  {
    id: "admin-1",
    email: "admin@safeguard.local",
    name: "System Admin",
    role: "admin" as const,
    password: "Admin@123",
  },
  {
    id: "user-1",
    email: "safety.officer@safeguard.local",
    name: "Safety Officer",
    role: "user" as const,
    password: "User@123",
  },
];

const readStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // no-op
  }
};

const removeStorage = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // no-op
  }
};

const decodeHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const hashPassword = async (password: string): Promise<string> => {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoded = new TextEncoder().encode(password);
    const hash = await crypto.subtle.digest("SHA-256", encoded);
    return decodeHex(hash);
  }

  return btoa(password);
};

const parseAccounts = (raw: string | null): AuthAccount[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as AuthAccount[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry) => entry?.id && entry?.email && entry?.passwordHash)
      .map((entry) => ({
        ...entry,
        preferredLanguage: normalizeLanguage((entry as { preferredLanguage?: unknown }).preferredLanguage),
        mfaEnabled: !!entry.mfaEnabled,
      }));
  } catch {
    return [];
  }
};

const parseSession = (raw: string | null): AuthSession | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.currentUserId) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const createToken = () => `token_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const toPublicUser = (account: AuthAccount): User => ({
  id: account.id,
  email: account.email,
  name: account.name,
  role: account.role,
  preferredLanguage: account.preferredLanguage,
  mfaEnabled: account.mfaEnabled,
});

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const getImpersonationContext = (session: AuthSession | null, accounts: AuthAccount[]) => {
  if (!session) {
    return {
      effectiveAccount: null,
      impersonatorAccount: null,
      isImpersonating: false,
    };
  }

  const effectiveAccount = accounts.find((account) => account.id === session.currentUserId) ?? null;
  const impersonatorAccount = session.impersonatorUserId
    ? accounts.find((account) => account.id === session.impersonatorUserId) ?? null
    : null;

  return {
    effectiveAccount,
    impersonatorAccount,
    isImpersonating: !!session.impersonatorUserId,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<AuthAccount[]>([]);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      try {
        const existingAccounts = parseAccounts(readStorage(ACCOUNTS_STORAGE_KEY));

        if (existingAccounts.length > 0) {
          setAccounts(existingAccounts);
          setSession(parseSession(readStorage(SESSION_STORAGE_KEY)));
          return;
        }

        const seededAccounts: AuthAccount[] = await Promise.all(
          DEFAULT_ACCOUNTS_SEED.map(async (seed) => ({
            id: seed.id,
            email: seed.email,
            name: seed.name,
            role: seed.role,
            preferredLanguage: "english",
            mfaEnabled: false,
            passwordHash: await hashPassword(seed.password),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })),
        );

        setAccounts(seededAccounts);
        writeStorage(ACCOUNTS_STORAGE_KEY, JSON.stringify(seededAccounts));
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  useEffect(() => {
    const { effectiveAccount, impersonatorAccount, isImpersonating } = getImpersonationContext(session, accounts);

    if (!effectiveAccount) {
      removeStorage(USER_STORAGE_KEY);
      removeStorage(TOKEN_STORAGE_KEY);
      removeStorage(SESSION_STORAGE_KEY);
      return;
    }

    const publicUser: User = {
      ...toPublicUser(effectiveAccount),
      isImpersonating,
      impersonatedByName: impersonatorAccount?.name,
    };

    writeStorage(USER_STORAGE_KEY, JSON.stringify(publicUser));

    const token = readStorage(TOKEN_STORAGE_KEY);
    if (!token) {
      writeStorage(TOKEN_STORAGE_KEY, createToken());
    }

    if (session) {
      writeStorage(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  }, [accounts, session]);

  const user = useMemo(() => {
    const { effectiveAccount, impersonatorAccount, isImpersonating } = getImpersonationContext(session, accounts);
    if (!effectiveAccount) {
      return null;
    }

    return {
      ...toPublicUser(effectiveAccount),
      isImpersonating,
      impersonatedByName: impersonatorAccount?.name,
    };
  }, [accounts, session]);

  const canAdministerUsers = useMemo(() => {
    if (!session) {
      return false;
    }

    const adminReferenceId = session.impersonatorUserId ?? session.currentUserId;
    const adminAccount = accounts.find((account) => account.id === adminReferenceId);
    return adminAccount?.role === "admin";
  }, [accounts, session]);

  const systemUsers = useMemo(() => accounts.map(toPublicUser), [accounts]);

  const login = async (email: string, password: string, mfaCode?: string): Promise<void> => {
    setIsLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail || !password) {
        throw new Error("Email and password are required");
      }

      if (!isValidEmail(normalizedEmail)) {
        throw new Error("Invalid email format");
      }

      const target = accounts.find((entry) => entry.email.toLowerCase() === normalizedEmail);
      if (!target) {
        throw new Error("Invalid email or password");
      }

      const incomingHash = await hashPassword(password);
      if (incomingHash !== target.passwordHash) {
        throw new Error("Invalid email or password");
      }

      if (target.mfaEnabled) {
        if (!mfaCode?.trim()) {
          issueMfaChallenge(target.id);
          throw new Error("MFA code required");
        }

        const isValidMfaCode = verifyMfaChallenge(target.id, mfaCode);
        if (!isValidMfaCode) {
          throw new Error("Invalid MFA code");
        }

        clearMfaChallengeForUser(target.id);
      }

      setSession({ currentUserId: target.id });
      writeStorage(TOKEN_STORAGE_KEY, createToken());

      logAuditEvent({
        module: "auth",
        action: "login",
        description: `${target.name} signed in`,
        actor: {
          id: target.id,
          name: target.name,
          email: target.email,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string): Promise<User> => {
    setIsLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedName = name.trim();

      if (!normalizedEmail || !password || !normalizedName) {
        throw new Error("Email, password, and name are required");
      }

      if (!isValidEmail(normalizedEmail)) {
        throw new Error("Invalid email format");
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      if (accounts.some((entry) => entry.email.toLowerCase() === normalizedEmail)) {
        throw new Error("An account with this email already exists");
      }

      const now = new Date().toISOString();
      const newAccount: AuthAccount = {
        id: `user_${Date.now()}`,
        email: normalizedEmail,
        name: normalizedName,
        role: "user",
        preferredLanguage: "english",
        mfaEnabled: false,
        passwordHash: await hashPassword(password),
        createdAt: now,
        updatedAt: now,
      };

      const next = [...accounts, newAccount];
      setAccounts(next);
      writeStorage(ACCOUNTS_STORAGE_KEY, JSON.stringify(next));
      setSession({ currentUserId: newAccount.id });
      writeStorage(TOKEN_STORAGE_KEY, createToken());

      logAuditEvent({
        module: "auth",
        action: "register",
        description: `${newAccount.name} registered a new account`,
        actor: {
          id: newAccount.id,
          name: newAccount.name,
          email: newAccount.email,
        },
      });

      return toPublicUser(newAccount);
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    if (!session || !user) {
      throw new Error("Not authenticated");
    }

    if (session.impersonatorUserId) {
      throw new Error("Stop impersonation before changing password");
    }

    if (!currentPassword || !newPassword) {
      throw new Error("Current and new passwords are required");
    }

    if (newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters");
    }

    const currentAccount = accounts.find((entry) => entry.id === user.id);
    if (!currentAccount) {
      throw new Error("Account not found");
    }

    const currentHash = await hashPassword(currentPassword);
    if (currentHash !== currentAccount.passwordHash) {
      throw new Error("Current password is incorrect");
    }

    const updated = await Promise.all(
      accounts.map(async (entry) => {
        if (entry.id !== currentAccount.id) {
          return entry;
        }

        return {
          ...entry,
          passwordHash: await hashPassword(newPassword),
          updatedAt: new Date().toISOString(),
        };
      }),
    );

    setAccounts(updated);
    writeStorage(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));

    logAuditEvent({
      module: "auth",
      action: "change_password",
      description: `${currentAccount.name} changed their password`,
      actor: {
        id: currentAccount.id,
        name: currentAccount.name,
        email: currentAccount.email,
      },
    });
  };

  const resetUserPassword = async (userId: string, newPassword: string): Promise<void> => {
    if (!session) {
      throw new Error("Not authenticated");
    }

    const adminReferenceId = session.impersonatorUserId ?? session.currentUserId;
    const adminAccount = accounts.find((entry) => entry.id === adminReferenceId);

    if (!adminAccount || adminAccount.role !== "admin") {
      throw new Error("Only system admins can reset passwords");
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters");
    }

    if (!accounts.some((entry) => entry.id === userId)) {
      throw new Error("Target user not found");
    }

    const updated = await Promise.all(
      accounts.map(async (entry) => {
        if (entry.id !== userId) {
          return entry;
        }

        return {
          ...entry,
          passwordHash: await hashPassword(newPassword),
          updatedAt: new Date().toISOString(),
        };
      }),
    );

    setAccounts(updated);
    writeStorage(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));

    const targetUser = updated.find((entry) => entry.id === userId);
    logAuditEvent({
      module: "auth",
      action: "reset_password",
      description: `Password reset for ${targetUser?.name ?? userId}`,
      actor: {
        id: adminAccount.id,
        name: adminAccount.name,
        email: adminAccount.email,
      },
    });
  };

  const setCurrentUserMfaEnabled = async (enabled: boolean): Promise<void> => {
    if (!session || !user) {
      throw new Error("Not authenticated");
    }

    if (session.impersonatorUserId) {
      throw new Error("Stop impersonation before updating MFA settings");
    }

    const currentAccount = accounts.find((entry) => entry.id === user.id);
    if (!currentAccount) {
      throw new Error("Account not found");
    }

    const updated = accounts.map((entry) =>
      entry.id === currentAccount.id
        ? {
            ...entry,
            mfaEnabled: enabled,
            updatedAt: new Date().toISOString(),
          }
        : entry,
    );

    if (!enabled) {
      clearMfaChallengeForUser(currentAccount.id);
    }

    setAccounts(updated);
    writeStorage(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));

    logAuditEvent({
      module: "auth",
      action: enabled ? "enable_mfa" : "disable_mfa",
      description: `${currentAccount.name} ${enabled ? "enabled" : "disabled"} MFA`,
      actor: {
        id: currentAccount.id,
        name: currentAccount.name,
        email: currentAccount.email,
      },
    });
  };

  const setUserMfaEnabled = async (userId: string, enabled: boolean): Promise<void> => {
    if (!session) {
      throw new Error("Not authenticated");
    }

    const adminReferenceId = session.impersonatorUserId ?? session.currentUserId;
    const adminAccount = accounts.find((entry) => entry.id === adminReferenceId);

    if (!adminAccount || adminAccount.role !== "admin") {
      throw new Error("Only system admins can update MFA settings");
    }

    const targetUser = accounts.find((entry) => entry.id === userId);
    if (!targetUser) {
      throw new Error("Target user not found");
    }

    const updated = accounts.map((entry) =>
      entry.id === targetUser.id
        ? {
            ...entry,
            mfaEnabled: enabled,
            updatedAt: new Date().toISOString(),
          }
        : entry,
    );

    if (!enabled) {
      clearMfaChallengeForUser(targetUser.id);
    }

    setAccounts(updated);
    writeStorage(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));

    logAuditEvent({
      module: "auth",
      action: enabled ? "admin_enable_mfa" : "admin_disable_mfa",
      description: `${adminAccount.name} ${enabled ? "enabled" : "disabled"} MFA for ${targetUser.name}`,
      actor: {
        id: adminAccount.id,
        name: adminAccount.name,
        email: adminAccount.email,
      },
    });
  };

  const setCurrentUserLanguagePreference = async (language: SystemLanguage): Promise<void> => {
    if (!session || !user) {
      throw new Error("Not authenticated");
    }

    if (!VALID_LANGUAGES.has(language)) {
      throw new Error("Unsupported language");
    }

    const currentAccount = accounts.find((entry) => entry.id === user.id);
    if (!currentAccount) {
      throw new Error("Account not found");
    }

    const updated = accounts.map((entry) =>
      entry.id === currentAccount.id
        ? {
            ...entry,
            preferredLanguage: language,
            updatedAt: new Date().toISOString(),
          }
        : entry,
    );

    setAccounts(updated);
    writeStorage(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));

    logAuditEvent({
      module: "auth",
      action: "update_language_preference",
      description: `${currentAccount.name} changed language preference to ${language}`,
      actor: {
        id: currentAccount.id,
        name: currentAccount.name,
        email: currentAccount.email,
      },
      metadata: { language },
    });
  };

  const impersonateUser = (userId: string) => {
    if (!session) {
      throw new Error("Not authenticated");
    }

    const adminReferenceId = session.impersonatorUserId ?? session.currentUserId;
    const adminAccount = accounts.find((entry) => entry.id === adminReferenceId);
    if (!adminAccount || adminAccount.role !== "admin") {
      throw new Error("Only system admins can impersonate users");
    }

    if (!accounts.some((entry) => entry.id === userId)) {
      throw new Error("Target user not found");
    }

    if (adminReferenceId === userId) {
      setSession({ currentUserId: adminReferenceId });
      return;
    }

    setSession({
      currentUserId: userId,
      impersonatorUserId: adminReferenceId,
    });

    const targetUser = accounts.find((entry) => entry.id === userId);
    logAuditEvent({
      module: "auth",
      action: "start_impersonation",
      description: `${adminAccount.name} started impersonating ${targetUser?.name ?? userId}`,
      actor: {
        id: adminAccount.id,
        name: adminAccount.name,
        email: adminAccount.email,
      },
    });
  };

  const stopImpersonation = () => {
    if (!session?.impersonatorUserId) {
      return;
    }

    const adminAccount = accounts.find((entry) => entry.id === session.impersonatorUserId);
    const impersonatedAccount = accounts.find((entry) => entry.id === session.currentUserId);

    setSession({ currentUserId: session.impersonatorUserId });

    if (adminAccount) {
      logAuditEvent({
        module: "auth",
        action: "stop_impersonation",
        description: `${adminAccount.name} stopped impersonating ${impersonatedAccount?.name ?? session.currentUserId}`,
        actor: {
          id: adminAccount.id,
          name: adminAccount.name,
          email: adminAccount.email,
        },
      });
    }
  };

  const logout = (): void => {
    const activeUser = user;

    setSession(null);
    removeStorage(USER_STORAGE_KEY);
    removeStorage(TOKEN_STORAGE_KEY);
    removeStorage(SESSION_STORAGE_KEY);

    if (activeUser) {
      logAuditEvent({
        module: "auth",
        action: "logout",
        description: `${activeUser.name} signed out`,
        actor: {
          id: activeUser.id,
          name: activeUser.name,
          email: activeUser.email,
        },
      });
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isImpersonating: !!user?.isImpersonating,
    canAdministerUsers,
    systemUsers,
    login,
    register,
    logout,
    changePassword,
    resetUserPassword,
    setCurrentUserMfaEnabled,
    setUserMfaEnabled,
    setCurrentUserLanguagePreference,
    impersonateUser,
    stopImpersonation,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
