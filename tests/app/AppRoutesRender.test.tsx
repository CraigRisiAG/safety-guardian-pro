import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';

const mockUseAuth = vi.fn();
const mockUseAdminSettings = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/useAdminSettings', () => ({
  useAdminSettings: () => mockUseAdminSettings(),
}));

vi.mock('@/pages/Index', () => ({
  default: () => <div>INDEX_PAGE</div>,
}));

vi.mock('@/pages/Incidents', () => ({
  default: () => <div>INCIDENTS_PAGE</div>,
}));

vi.mock('@/pages/Drills', () => ({
  default: () => <div>DRILLS_PAGE</div>,
}));

vi.mock('@/pages/CheckIn', () => ({
  default: () => <div>CHECK_IN_PAGE</div>,
}));

vi.mock('@/pages/Login', () => ({
  default: () => <div>LOGIN_PAGE</div>,
}));

vi.mock('@/pages/Register', () => ({
  default: () => <div>REGISTER_PAGE</div>,
}));

vi.mock('@/pages/SafetyCheckIn', () => ({
  default: () => <div>SAFETY_CHECKIN_PAGE</div>,
}));

vi.mock('@/pages/Admin', () => ({
  default: () => <div>ADMIN_PAGE</div>,
}));

vi.mock('@/pages/HealthOfficialsGaps', () => ({
  default: () => <div>HEALTH_GAPS_PAGE</div>,
}));

vi.mock('@/pages/ComplianceCalendar', () => ({
  default: () => <div>COMPLIANCE_CALENDAR_PAGE</div>,
}));

vi.mock('@/pages/NotFound', () => ({
  default: () => <div>NOT_FOUND_PAGE</div>,
}));

const setPath = (path: string) => {
  window.history.replaceState({}, '', path);
};

describe('App route rendering', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'admin-1',
        email: 'admin@safeguard.local',
        name: 'System Admin',
        role: 'admin',
      },
      isLoading: false,
      isAuthenticated: true,
      isImpersonating: false,
      canAdministerUsers: true,
      systemUsers: [],
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      resetUserPassword: vi.fn(),
      impersonateUser: vi.fn(),
      stopImpersonation: vi.fn(),
    });

    mockUseAdminSettings.mockReturnValue({
      settings: {
        userPermissions: [
          {
            id: 'perm-1',
            userId: 'admin-1',
            userName: 'System Admin',
            email: 'admin@safeguard.local',
            role: 'super_admin',
            buildingAccess: [],
            workDays: ['monday'],
            safetyRoles: [],
            canStartDrills: true,
            canResolveIncidents: true,
            canManageUsers: true,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
      },
    });
  });

  it.each([
    ['/login', 'LOGIN_PAGE'],
    ['/register', 'REGISTER_PAGE'],
    ['/safety-checkin', 'SAFETY_CHECKIN_PAGE'],
  ])('renders public route %s', (path, marker) => {
    setPath(path);
    render(<App />);
    expect(screen.getByText(marker)).toBeInTheDocument();
  });

  it.each([
    ['/', 'INDEX_PAGE'],
    ['/incidents', 'INCIDENTS_PAGE'],
    ['/drills', 'DRILLS_PAGE'],
    ['/check-in', 'CHECK_IN_PAGE'],
    ['/compliance-calendar', 'COMPLIANCE_CALENDAR_PAGE'],
    ['/health-official-gaps', 'HEALTH_GAPS_PAGE'],
    ['/admin', 'ADMIN_PAGE'],
  ])('renders protected route %s for authenticated users', (path, marker) => {
    setPath(path);
    render(<App />);
    expect(screen.getByText(marker)).toBeInTheDocument();
  });

  it('redirects protected routes to login when unauthenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      isImpersonating: false,
      canAdministerUsers: false,
      systemUsers: [],
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      resetUserPassword: vi.fn(),
      impersonateUser: vi.fn(),
      stopImpersonation: vi.fn(),
    });

    setPath('/incidents');
    render(<App />);
    expect(screen.getByText('LOGIN_PAGE')).toBeInTheDocument();
  });

  it('redirects /admin to index when user cannot manage users', () => {
    mockUseAdminSettings.mockReturnValue({
      settings: {
        userPermissions: [
          {
            id: 'perm-2',
            userId: 'admin-1',
            userName: 'System Admin',
            email: 'admin@safeguard.local',
            role: 'admin',
            buildingAccess: [],
            workDays: ['monday'],
            safetyRoles: [],
            canStartDrills: true,
            canResolveIncidents: true,
            canManageUsers: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
      },
    });

    setPath('/admin');
    render(<App />);
    expect(screen.getByText('INDEX_PAGE')).toBeInTheDocument();
  });

  it('renders not found route for unknown path', () => {
    setPath('/this-path-does-not-exist');
    render(<App />);
    expect(screen.getByText('NOT_FOUND_PAGE')).toBeInTheDocument();
  });
});
