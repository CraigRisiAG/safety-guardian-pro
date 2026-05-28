import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { getLatestMfaCodeForUser } from '@/lib/mfaTooling';

vi.mock('@/lib/auditLog', () => ({
  logAuditEvent: vi.fn(),
}));

type AuthSnapshot = ReturnType<typeof useAuth>;

async function expectAuthError(operation: () => Promise<unknown>, message: string) {
  let captured: unknown;

  await act(async () => {
    try {
      await operation();
    } catch (error) {
      captured = error;
    }
  });

  expect(captured).toBeInstanceOf(Error);
  expect((captured as Error).message).toBe(message);
}

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

describe('AuthContext negative flows and account types', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('seeds default admin and user accounts', async () => {
    const auth = renderAuthHarness();

    await waitFor(() => expect(auth.current?.isLoading).toBe(false));

    const users = auth.current?.systemUsers ?? [];
    const roles = users.map((entry) => entry.role);

    expect(users.length).toBeGreaterThanOrEqual(2);
    expect(roles).toContain('admin');
    expect(roles).toContain('user');
  });

  it('rejects login with missing credentials', async () => {
    const auth = renderAuthHarness();
    await waitFor(() => expect(auth.current?.isLoading).toBe(false));

    await expectAuthError(() => auth.current!.login('', ''), 'Email and password are required');
  });

  it('rejects login with invalid email format', async () => {
    const auth = renderAuthHarness();
    await waitFor(() => expect(auth.current?.isLoading).toBe(false));

    await expectAuthError(() => auth.current!.login('invalid-email', 'anything'), 'Invalid email format');
  });

  it('rejects login for unknown account and wrong password with the same message', async () => {
    const auth = renderAuthHarness();
    await waitFor(() => expect(auth.current?.isLoading).toBe(false));

    await expectAuthError(() => auth.current!.login('missing@safeguard.local', 'SomePass1'), 'Invalid email or password');
    await expectAuthError(() => auth.current!.login('admin@safeguard.local', 'WrongPass1'), 'Invalid email or password');
  });

  it('rejects register when required values are missing', async () => {
    const auth = renderAuthHarness();
    await waitFor(() => expect(auth.current?.isLoading).toBe(false));

    await expectAuthError(() => auth.current!.register('', '', ''), 'Email, password, and name are required');
  });

  it('rejects register for invalid email format', async () => {
    const auth = renderAuthHarness();
    await waitFor(() => expect(auth.current?.isLoading).toBe(false));

    await expectAuthError(() => auth.current!.register('bad-email', 'Password1', 'Jane'), 'Invalid email format');
  });

  it('rejects register for short password', async () => {
    const auth = renderAuthHarness();
    await waitFor(() => expect(auth.current?.isLoading).toBe(false));

    await expectAuthError(() => auth.current!.register('jane@example.com', '12345', 'Jane'), 'Password must be at least 6 characters');
  });

  it('rejects register when account already exists regardless of email case', async () => {
    const auth = renderAuthHarness();
    await waitFor(() => expect(auth.current?.isLoading).toBe(false));

    await expectAuthError(
      () => auth.current!.register('ADMIN@SAFEGUARD.LOCAL', 'Password1', 'Duplicate'),
      'An account with this email already exists',
    );
  });

  it('rejects password change when not authenticated', async () => {
    const auth = renderAuthHarness();
    await waitFor(() => expect(auth.current?.isLoading).toBe(false));

    await expectAuthError(() => auth.current!.changePassword('Current1', 'NewPassword1'), 'Not authenticated');
  });

  it('rejects password reset when not authenticated', async () => {
    const auth = renderAuthHarness();
    await waitFor(() => expect(auth.current?.isLoading).toBe(false));

    await expectAuthError(() => auth.current!.resetUserPassword('user-1', 'NewPassword1'), 'Not authenticated');
  });

  it('rejects reset password when authenticated user is not admin', async () => {
    const auth = renderAuthHarness();
    await waitFor(() => expect(auth.current?.isLoading).toBe(false));

    await act(async () => {
      await auth.current!.login('safety.officer@safeguard.local', 'User@123');
    });

    await expectAuthError(
      () => auth.current!.resetUserPassword('admin-1', 'NewPassword1'),
      'Only system admins can reset passwords',
    );
  });

  it('rejects change password for wrong current password', async () => {
    const auth = renderAuthHarness();
    await waitFor(() => expect(auth.current?.isLoading).toBe(false));

    await act(async () => {
      await auth.current!.login('admin@safeguard.local', 'Admin@123');
    });

    await expectAuthError(
      () => auth.current!.changePassword('WrongCurrent', 'NewPassword1'),
      'Current password is incorrect',
    );
  });

  it('rejects change password when current/new values are missing', async () => {
    const auth = renderAuthHarness();
    await waitFor(() => expect(auth.current?.isLoading).toBe(false));

    await act(async () => {
      await auth.current!.login('admin@safeguard.local', 'Admin@123');
    });

    await expectAuthError(
      () => auth.current!.changePassword('', ''),
      'Current and new passwords are required',
    );
  });

  it('rejects change password when new password is too short', async () => {
    const auth = renderAuthHarness();
    await waitFor(() => expect(auth.current?.isLoading).toBe(false));

    await act(async () => {
      await auth.current!.login('admin@safeguard.local', 'Admin@123');
    });

    await expectAuthError(
      () => auth.current!.changePassword('Admin@123', '123'),
      'New password must be at least 6 characters',
    );
  });

  it('rejects changing password while impersonating', async () => {
    const auth = renderAuthHarness();
    await waitFor(() => expect(auth.current?.isLoading).toBe(false));

    await act(async () => {
      await auth.current!.login('admin@safeguard.local', 'Admin@123');
    });

    await waitFor(() => expect(auth.current?.isAuthenticated).toBe(true));

    act(() => {
      auth.current!.impersonateUser('user-1');
    });

    await expectAuthError(
      () => auth.current!.changePassword('User@123', 'NewPassword1'),
      'Stop impersonation before changing password',
    );
  });

  it('rejects impersonation when unauthenticated, non-admin, or target user is missing', async () => {
    const auth = renderAuthHarness();
    await waitFor(() => expect(auth.current?.isLoading).toBe(false));

    expect(() => auth.current!.impersonateUser('user-1')).toThrow('Not authenticated');

    await act(async () => {
      await auth.current!.login('safety.officer@safeguard.local', 'User@123');
    });

    expect(() => auth.current!.impersonateUser('admin-1')).toThrow('Only system admins can impersonate users');

    await act(async () => {
      auth.current!.logout();
      await auth.current!.login('admin@safeguard.local', 'Admin@123');
    });

    expect(() => auth.current!.impersonateUser('missing-user')).toThrow('Target user not found');
  });

  it('rejects admin reset for short password and unknown user', async () => {
    const auth = renderAuthHarness();
    await waitFor(() => expect(auth.current?.isLoading).toBe(false));

    await act(async () => {
      await auth.current!.login('admin@safeguard.local', 'Admin@123');
    });

    await expectAuthError(
      () => auth.current!.resetUserPassword('user-1', '123'),
      'New password must be at least 6 characters',
    );
    await expectAuthError(
      () => auth.current!.resetUserPassword('missing-user', 'Valid123'),
      'Target user not found',
    );
  });

  it('supports users enabling and disabling their own MFA setting', async () => {
    const auth = renderAuthHarness();
    await waitFor(() => expect(auth.current?.isLoading).toBe(false));

    await act(async () => {
      await auth.current!.login('safety.officer@safeguard.local', 'User@123');
    });

    await waitFor(() => expect(auth.current?.isAuthenticated).toBe(true));

    await act(async () => {
      await auth.current!.setCurrentUserMfaEnabled(true);
    });

    expect(auth.current?.user?.mfaEnabled).toBe(true);

    await act(async () => {
      await auth.current!.setCurrentUserMfaEnabled(false);
    });

    expect(auth.current?.user?.mfaEnabled).toBe(false);
  });

  it('requires MFA code at login when MFA is enabled by admin', async () => {
    const auth = renderAuthHarness();
    await waitFor(() => expect(auth.current?.isLoading).toBe(false));

    await act(async () => {
      await auth.current!.login('admin@safeguard.local', 'Admin@123');
    });

    await waitFor(() => expect(auth.current?.isAuthenticated).toBe(true));

    await act(async () => {
      await auth.current!.setUserMfaEnabled('user-1', true);
      auth.current!.logout();
    });

    await expectAuthError(
      () => auth.current!.login('safety.officer@safeguard.local', 'User@123'),
      'MFA code required',
    );

    const issuedCode = getLatestMfaCodeForUser('user-1');
    expect(issuedCode).toBeTruthy();

    await act(async () => {
      await auth.current!.login('safety.officer@safeguard.local', 'User@123', issuedCode as string);
    });

    expect(auth.current?.isAuthenticated).toBe(true);
    expect(auth.current?.user?.id).toBe('user-1');
  });
});
