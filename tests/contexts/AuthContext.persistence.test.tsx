import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

vi.mock('@/lib/auditLog', () => ({
  logAuditEvent: vi.fn(),
}));

type AuthSnapshot = ReturnType<typeof useAuth>;

const ACCOUNTS_STORAGE_KEY = 'auth_accounts';
const SESSION_STORAGE_KEY = 'auth_session';
const USER_STORAGE_KEY = 'auth_user';
const TOKEN_STORAGE_KEY = 'auth_token';

function renderAuthHarness() {
  const snapshot: { current?: AuthSnapshot } = {};

  const Harness = () => {
    snapshot.current = useAuth();
    return null;
  };

  render(
    <AuthProvider>
      <Harness />
    </AuthProvider>,
  );

  return snapshot;
}

describe('AuthContext persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('seeds and stores default auth accounts', async () => {
    renderAuthHarness();

    await waitFor(() => {
      const storedAccounts = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      expect(storedAccounts).not.toBeNull();
      const parsed = JSON.parse(storedAccounts as string) as Array<{ role: string }>;
      expect(parsed.length).toBeGreaterThanOrEqual(2);
      expect(parsed.some((entry) => entry.role === 'admin')).toBe(true);
      expect(parsed.some((entry) => entry.role === 'user')).toBe(true);
    });
  });

  it('persists register flow to accounts, session, user and token storage keys', async () => {
    const auth = renderAuthHarness();
    await waitFor(() => expect(auth.current?.isLoading).toBe(false));

    await act(async () => {
      await auth.current!.register('new.user@example.com', 'Password1', 'New User');
    });

    const storedAccounts = JSON.parse(localStorage.getItem(ACCOUNTS_STORAGE_KEY) as string) as Array<{
      id: string;
      email: string;
    }>;
    const created = storedAccounts.find((entry) => entry.email === 'new.user@example.com');

    expect(created).toBeDefined();

    const storedSession = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) as string) as {
      currentUserId: string;
    };
    expect(storedSession.currentUserId).toBe(created?.id);

    const storedUser = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) as string) as {
      id: string;
      email: string;
    };
    expect(storedUser.id).toBe(created?.id);
    expect(storedUser.email).toBe('new.user@example.com');

    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    expect(token).toBeTruthy();
    expect(token?.startsWith('token_')).toBe(true);
  });

  it('clears session-scoped keys on logout but keeps account records', async () => {
    const auth = renderAuthHarness();
    await waitFor(() => expect(auth.current?.isLoading).toBe(false));

    await act(async () => {
      await auth.current!.login('admin@safeguard.local', 'Admin@123');
    });

    expect(localStorage.getItem(SESSION_STORAGE_KEY)).not.toBeNull();
    expect(localStorage.getItem(USER_STORAGE_KEY)).not.toBeNull();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).not.toBeNull();

    act(() => {
      auth.current!.logout();
    });

    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(USER_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(ACCOUNTS_STORAGE_KEY)).not.toBeNull();
  });

  it('rehydrates authenticated user from stored accounts and session', async () => {
    localStorage.setItem(
      ACCOUNTS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'user-77',
          email: 'rehydrated.user@example.com',
          name: 'Rehydrated User',
          role: 'user',
          passwordHash: 'placeholder-hash',
          createdAt: '2026-05-01T00:00:00.000Z',
          updatedAt: '2026-05-01T00:00:00.000Z',
        },
      ]),
    );

    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        currentUserId: 'user-77',
      }),
    );

    const auth = renderAuthHarness();

    await waitFor(() => {
      expect(auth.current?.isLoading).toBe(false);
      expect(auth.current?.isAuthenticated).toBe(true);
      expect(auth.current?.user?.id).toBe('user-77');
      expect(auth.current?.user?.email).toBe('rehydrated.user@example.com');
    });
  });

  it('persists current user language preference updates to account and user storage', async () => {
    const auth = renderAuthHarness();
    await waitFor(() => expect(auth.current?.isLoading).toBe(false));

    await act(async () => {
      await auth.current!.login('admin@safeguard.local', 'Admin@123');
    });

    await act(async () => {
      await auth.current!.setCurrentUserLanguagePreference('spanish');
    });

    await waitFor(() => expect(auth.current?.user?.preferredLanguage).toBe('spanish'));

    const storedAccounts = JSON.parse(localStorage.getItem(ACCOUNTS_STORAGE_KEY) as string) as Array<{
      id: string;
      preferredLanguage?: string;
    }>;
    const adminAccount = storedAccounts.find((entry) => entry.id === 'admin-1');
    expect(adminAccount?.preferredLanguage).toBe('spanish');

    const storedUser = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) as string) as {
      preferredLanguage?: string;
    };
    expect(storedUser.preferredLanguage).toBe('spanish');
  });
});
