import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Index from '@/pages/Index';
import Admin from '@/pages/Admin';
import Incidents from '@/pages/Incidents';
import Drills from '@/pages/Drills';
import CheckIn from '@/pages/CheckIn';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import NotFound from '@/pages/NotFound';
import SafetyCheckIn from '@/pages/SafetyCheckIn';
import HealthOfficialsGaps from '@/pages/HealthOfficialsGaps';
import ComplianceCalendar from '@/pages/ComplianceCalendar';
import EmergencyChat from '@/pages/EmergencyChat';

const mockUseAuth = vi.fn();
const mockUseAdminSettings = vi.fn();
const mockUseDrillStatus = vi.fn();
const mockUseOfficeAttendance = vi.fn();
const mockLoadIncidentsFromStorage = vi.fn();
const mockSaveIncidentsToStorage = vi.fn();
const mockLoadDrillsFromStorage = vi.fn();
const mockSaveDrillsToStorage = vi.fn();
const mockGetDrillsStorageSnapshot = vi.fn();

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/dashboard/StatCard', () => ({
  StatCard: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/components/dashboard/RecentIncidents', () => ({
  RecentIncidents: () => <div>Recent incidents widget</div>,
}));

vi.mock('@/components/drills/StartDrillForm', () => ({
  StartDrillForm: () => <div>Start drill form</div>,
}));

vi.mock('@/components/dashboard/ComplianceCheckForm', () => ({
  ComplianceCheckForm: () => <button type="button">Compliance Check</button>,
}));

vi.mock('@/components/dashboard/ComplianceStatsWidget', () => ({
  ComplianceStatsWidget: () => <div>Compliance stats</div>,
}));

vi.mock('@/components/dashboard/ComplianceHistoryDialog', () => ({
  ComplianceHistoryDialog: () => <button type="button">History dialog</button>,
}));

vi.mock('@/components/dashboard/ComplianceCalendarDialog', () => ({
  ComplianceCalendarDialog: () => <button type="button">Calendar dialog</button>,
}));

vi.mock('@/components/dashboard/PersonnelDialog', () => ({
  PersonnelDialog: () => <div>Personnel dialog</div>,
}));

vi.mock('@/components/dashboard/CertificateExpiryWidget', () => ({
  CertificateExpiryWidget: () => <div>Certificate widget</div>,
}));

vi.mock('@/components/admin/BuildingsManager', () => ({
  BuildingsManager: () => <div>Buildings manager</div>,
}));

vi.mock('@/components/admin/UserPermissionsManager', () => ({
  UserPermissionsManager: () => <div>User permissions manager</div>,
}));

vi.mock('@/components/admin/HealthOfficialsCoverageSettings', () => ({
  HealthOfficialsCoverageSettings: () => <div>Coverage settings</div>,
}));

vi.mock('@/components/admin/ComplianceManager', () => ({
  ComplianceManager: () => <div>Compliance manager</div>,
}));

vi.mock('@/components/admin/IncidentFieldsManager', () => ({
  IncidentFieldsManager: () => <div>Incident fields manager</div>,
}));

vi.mock('@/components/admin/CheckTypeFieldsManager', () => ({
  CheckTypeFieldsManager: () => <div>Check type fields manager</div>,
}));

vi.mock('@/components/admin/SafetyRoleCoverageReport', () => ({
  SafetyRoleCoverageReport: () => <div>Safety role coverage report</div>,
}));

vi.mock('@/components/admin/CertificateManager', () => ({
  CertificateManager: () => <div>Certificate manager</div>,
}));

vi.mock('@/components/admin/SystemLogsViewer', () => ({
  SystemLogsViewer: () => <div>System logs viewer</div>,
}));

vi.mock('@/components/admin/NotificationDeliverySettings', () => ({
  NotificationDeliverySettings: () => <div>Notification delivery settings</div>,
}));

vi.mock('@/components/admin/NotificationCenter', () => ({
  NotificationCenter: () => <div>Notification center</div>,
}));

vi.mock('@/components/admin/NotificationIntegrationPortal', () => ({
  NotificationIntegrationPortal: () => <div>Notification integration portal</div>,
}));

vi.mock('@/components/checkin/SafetyCheckInCard', () => ({
  SafetyCheckInCard: () => <div>Safety check-in card</div>,
}));

vi.mock('@/hooks/useAdminSettings', () => ({
  useAdminSettings: () => mockUseAdminSettings(),
}));

vi.mock('@/hooks/useDrillStatus', () => ({
  useDrillStatus: () => mockUseDrillStatus(),
}));

vi.mock('@/hooks/useOfficeAttendance', () => ({
  useOfficeAttendance: () => mockUseOfficeAttendance(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/lib/incidentsStorage', () => ({
  loadIncidentsFromStorage: () => mockLoadIncidentsFromStorage(),
  saveIncidentsToStorage: (...args: unknown[]) => mockSaveIncidentsToStorage(...args),
}));

vi.mock('@/lib/drillsStorage', () => ({
  loadDrillsFromStorage: () => mockLoadDrillsFromStorage(),
  saveDrillsToStorage: (...args: unknown[]) => mockSaveDrillsToStorage(...args),
  getDrillsStorageSnapshot: () => mockGetDrillsStorageSnapshot(),
}));

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const baseSettings = {
  buildings: [
    {
      id: 'building-1',
      name: 'Main Office',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      floors: [
        {
          id: 'floor-1',
          buildingId: 'building-1',
          name: 'Ground Floor',
          level: 0,
          areas: [{ id: 'area-1', floorId: 'floor-1', name: 'Reception' }],
        },
      ],
    },
  ],
  userPermissions: [
    {
      id: 'perm-1',
      userId: 'admin-1',
      userName: 'Admin User',
      email: 'admin@safeguard.local',
      role: 'super_admin',
      buildingAccess: ['building-1'],
      primaryFloorId: 'floor-1',
      primaryAreaId: 'area-1',
      workDays: ['monday'],
      safetyRoles: [],
      canStartDrills: true,
      canResolveIncidents: true,
      canManageUsers: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  ],
  complianceChecks: [],
  safetyCheckItems: [],
  complianceCategories: [],
  customIncidentFields: [],
  checkTypeFields: [],
  healthOfficialsRequiredDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
};

const renderWithRouter = (node: React.ReactNode, route = '/') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="*" element={node} />
      </Routes>
    </MemoryRouter>,
  );

describe('Page smoke coverage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );

    mockUseAuth.mockReturnValue({
      user: {
        id: 'admin-1',
        email: 'admin@safeguard.local',
        name: 'Admin User',
        role: 'admin',
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    mockUseAdminSettings.mockReturnValue({
      settings: baseSettings,
      updateUserPermission: vi.fn(),
      bulkAddUserPermissions: vi.fn(),
      deleteUserPermission: vi.fn(),
      upsertUserPermissionByIdentity: vi.fn(),
    });

    mockUseDrillStatus.mockReturnValue({
      activeDrill: null,
      isCheckInEnabled: false,
      startDrill: vi.fn(),
      endDrill: vi.fn(),
      drillRecords: [],
    });

    mockUseOfficeAttendance.mockReturnValue({
      personnelInOfficeToday: 0,
    });

    mockLoadIncidentsFromStorage.mockReturnValue([]);
    mockSaveIncidentsToStorage.mockReset();
    mockLoadDrillsFromStorage.mockReturnValue([]);
    mockSaveDrillsToStorage.mockReset();
    mockGetDrillsStorageSnapshot.mockReturnValue('[]');
  });

  it('renders dashboard index page', () => {
    renderWithRouter(<Index />);
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('renders admin page', () => {
    renderWithRouter(<Admin />);
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('renders incidents page', () => {
    renderWithRouter(<Incidents />);
    expect(screen.getByText('Incident Management')).toBeInTheDocument();
  });

  it('renders drills page', () => {
    renderWithRouter(<Drills />);
    expect(screen.getByText('Drill Management')).toBeInTheDocument();
  });

  it('renders check-in page no-active-drill state', () => {
    renderWithRouter(<CheckIn />);
    expect(screen.getByText('No Active Drill')).toBeInTheDocument();
  });

  it('renders login page', () => {
    renderWithRouter(<Login />);
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
  });

  it('renders register page', () => {
    renderWithRouter(<Register />);
    expect(screen.getByText('Create your account')).toBeInTheDocument();
  });

  it('renders not-found page', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithRouter(<NotFound />, '/unknown-route');
    expect(screen.getByText('Oops! Page not found')).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });

  it('renders safety check-in no-active-drill state', () => {
    renderWithRouter(<SafetyCheckIn />);
    expect(screen.getByText('No Active Drill')).toBeInTheDocument();
  });

  it('renders health officials gaps page', () => {
    renderWithRouter(<HealthOfficialsGaps />);
    expect(screen.getByText('Health Officials Coverage Map')).toBeInTheDocument();
  });

  it('renders compliance calendar page', () => {
    renderWithRouter(<ComplianceCalendar />);
    expect(screen.getByText('Compliance Calendar')).toBeInTheDocument();
  });

  it('renders emergency chat page', () => {
    renderWithRouter(<EmergencyChat />);
    expect(screen.getByText('Emergency Chat')).toBeInTheDocument();
  });
});
