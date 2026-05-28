import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Login from '@/pages/Login';
import Register from '@/pages/Register';

const mockUseAuth = vi.fn();
const mockUseDrillStatus = vi.fn();
const mockUseAdminSettings = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/useDrillStatus', () => ({
  useDrillStatus: () => mockUseDrillStatus(),
}));

vi.mock('@/hooks/useAdminSettings', () => ({
  useAdminSettings: () => mockUseAdminSettings(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );

const renderRegister = () =>
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  );

describe('Auth page UI negative states', () => {
  beforeEach(() => {
    vi.stubEnv('DEV', true);

    mockUseDrillStatus.mockReturnValue({
      activeDrill: null,
      isCheckInEnabled: false,
    });

    mockUseAdminSettings.mockReturnValue({
      settings: {
        buildings: [],
      },
      upsertUserPermissionByIdentity: vi.fn(),
    });

    mockUseAuth.mockReturnValue({
      login: vi.fn(),
      register: vi.fn(),
      isLoading: false,
    });

    mockToastSuccess.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows default development admin and user account banner on login page', () => {
    renderLogin();

    expect(screen.getByText('Development mode only: default system accounts')).toBeInTheDocument();
    expect(screen.getByText('Admin: admin@safeguard.local / Admin@123')).toBeInTheDocument();
    expect(screen.getByText('User: safety.officer@safeguard.local / User@123')).toBeInTheDocument();
  });

  it('shows production support banner and hides default account banner on login page', () => {
    vi.stubEnv('DEV', false);
    renderLogin();

    expect(
      screen.getByText(
        'Production mode: default system accounts are disabled. Contact your system administrator for account support.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Development mode only: default system accounts')).not.toBeInTheDocument();
  });

  it('renders login error from auth service', async () => {
    const login = vi.fn().mockRejectedValue(new Error('Invalid email or password'));
    mockUseAuth.mockReturnValue({ login, isLoading: false });

    renderLogin();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@safeguard.local' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'WrongPassword1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });

  it('renders generic login failure when auth rejects a non-Error value', async () => {
    const login = vi.fn().mockRejectedValue('unknown failure');
    mockUseAuth.mockReturnValue({ login, isLoading: false });

    renderLogin();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@safeguard.local' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'AnyPassword1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Login failed')).toBeInTheDocument();
  });

  it('prompts for MFA code when auth requires second factor and retries login with code', async () => {
    const login = vi
      .fn()
      .mockRejectedValueOnce(new Error('MFA code required'))
      .mockResolvedValueOnce(undefined);

    mockUseAuth.mockReturnValue({ login, isLoading: false });

    renderLogin();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@safeguard.local' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Admin@123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByLabelText('MFA Code')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('MFA Code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify MFA & Sign In' }));

    expect(login).toHaveBeenNthCalledWith(1, 'admin@safeguard.local', 'Admin@123', undefined);
    expect(login).toHaveBeenNthCalledWith(2, 'admin@safeguard.local', 'Admin@123', '123456');
  });

  it('shows register validation messages for required name, email, and password', () => {
    renderRegister();

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  it('shows register validation for password minimum length', () => {
    renderRegister();

    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Safety User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: '12345' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: '12345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
  });

  it('shows register validation for short password and mismatched passwords', () => {
    renderRegister();

    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Safety User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: '12345' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: '54321' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('renders register error from auth service', async () => {
    const register = vi.fn().mockRejectedValue(new Error('An account with this email already exists'));
    mockUseAuth.mockReturnValue({ register, isLoading: false });

    renderRegister();

    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Safety User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@safeguard.local' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Valid123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Valid123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByText('An account with this email already exists')).toBeInTheDocument();
  });

  it('renders generic register failure when auth rejects a non-Error value', async () => {
    const register = vi.fn().mockRejectedValue({ problem: 'unknown' });
    mockUseAuth.mockReturnValue({ register, isLoading: false });

    renderRegister();

    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Safety User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Valid123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Valid123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByText('Registration failed')).toBeInTheDocument();
  });
});
