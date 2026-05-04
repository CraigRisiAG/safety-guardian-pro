import { UserRole } from '@/types/admin';

const ACCOUNTS_STORAGE_KEY = 'auth_accounts';

interface AuthAccount {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

const readAccounts = (): AuthAccount[] => {
  try {
    const stored = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as AuthAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAccounts = (accounts: AuthAccount[]) => {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // no-op
  }
};

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const hashPassword = async (password: string): Promise<string> => {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return toHex(digest);
  }

  return btoa(password);
};

const generateTemporaryPassword = () => {
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  const suffix = Date.now().toString().slice(-4);
  return `Temp!${random}${suffix}`;
};

const mapUserRoleToAuthRole = (role: UserRole): 'user' | 'admin' =>
  role === 'admin' || role === 'super_admin' ? 'admin' : 'user';

export async function ensureCredentialForRole(params: {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  forceResetPassword?: boolean;
}): Promise<{ created: boolean; passwordReset: boolean; temporaryPassword?: string }> {
  if (params.role === 'viewer') {
    return { created: false, passwordReset: false };
  }

  const normalizedEmail = params.email.trim().toLowerCase();
  const targetRole = mapUserRoleToAuthRole(params.role);
  const accounts = readAccounts();
  const existingIndex = accounts.findIndex((account) => account.email.toLowerCase() === normalizedEmail);

  if (existingIndex >= 0) {
    const updatedAccount = {
      ...accounts[existingIndex],
      name: params.name,
      role: targetRole,
      updatedAt: new Date().toISOString(),
    };

    let temporaryPassword: string | undefined;
    if (params.forceResetPassword) {
      temporaryPassword = generateTemporaryPassword();
      updatedAccount.passwordHash = await hashPassword(temporaryPassword);
    }

    accounts[existingIndex] = updatedAccount;
    writeAccounts(accounts);

    return {
      created: false,
      passwordReset: !!temporaryPassword,
      temporaryPassword,
    };
  }

  const temporaryPassword = generateTemporaryPassword();
  const newAccount: AuthAccount = {
    id: params.userId,
    email: normalizedEmail,
    name: params.name,
    role: targetRole,
    passwordHash: await hashPassword(temporaryPassword),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  accounts.push(newAccount);
  writeAccounts(accounts);

  return {
    created: true,
    passwordReset: true,
    temporaryPassword,
  };
}
