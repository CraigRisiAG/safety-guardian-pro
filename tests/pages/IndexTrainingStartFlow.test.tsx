import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Index from '@/pages/Index';

const mockUseAuth = vi.fn();
const mockUseAdminSettings = vi.fn();
const mockUseDrillStatus = vi.fn();
const mockUseOfficeAttendance = vi.fn();
const mockLoadIncidentsFromStorage = vi.fn();
const mockSaveIncidentsToStorage = vi.fn();
const mockLoadDrillsFromStorage = vi.fn();
const mockSaveDrillsToStorage = vi.fn();
const mockGetDrillsStorageSnapshot = vi.fn();
const mockUpsertCertificateForTrainingPass = vi.fn();

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/dashboard/StatCard', () => ({
  StatCard: ({ title, onClick }: { title: string; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{title}</button>
  ),
}));

vi.mock('@/components/dashboard/RecentIncidents', () => ({
  RecentIncidents: () => <div>Recent incidents widget</div>,
}));

vi.mock('@/components/drills/StartDrillForm', () => ({
  StartDrillForm: () => <div>Start drill form</div>,
}));

vi.mock('@/components/dashboard/ComplianceStatsWidget', () => ({
  ComplianceStatsWidget: () => <div>Compliance stats widget</div>,
}));

vi.mock('@/components/dashboard/ComplianceHistoryDialog', () => ({
  ComplianceHistoryDialog: () => <button type="button">History dialog</button>,
}));

vi.mock('@/components/dashboard/ComplianceCalendarDialog', () => ({
  ComplianceCalendarDialog: () => <button type="button">Calendar dialog</button>,
}));

vi.mock('@/components/dashboard/PersonnelDialog', () => ({
  PersonnelDialog: ({ trigger }: { trigger: React.ReactNode }) => <div>{trigger}</div>,
}));

vi.mock('@/components/dashboard/CertificateExpiryWidget', () => ({
  CertificateExpiryWidget: () => <div>Certificate widget</div>,
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

vi.mock('@/hooks/useCertificates', () => ({
  useCertificates: () => ({
    upsertCertificateForTrainingPass: mockUpsertCertificateForTrainingPass,
    certificateValidityYearsByType: {
      fire_marshall: 3,
      evacuation_warden: 3,
      first_aider: 3,
      health_safety_officer: 3,
      evac_chair: 3,
    },
  }),
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

describe('Index training start flow integration', () => {
  beforeEach(() => {
    const now = new Date('2026-05-25T09:00:00.000Z');

    mockUseAuth.mockReturnValue({
      user: {
        id: 'admin-1',
        email: 'admin@safeguard.local',
        name: 'Admin User',
        role: 'super_admin',
      },
      isAuthenticated: true,
      isLoading: false,
    });

    mockUseAdminSettings.mockReturnValue({
      settings: {
        buildings: [
          {
            id: 'building-1',
            name: 'Main Office',
            createdAt: now,
            updatedAt: now,
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
            createdAt: now,
            updatedAt: now,
          },
        ],
        complianceChecks: [
          {
            id: 'training-check-1',
            name: 'Training: Admin User - Fire Marshall (Level 1)',
            description: 'Assigned from approved certificate menu',
            frequency: 'monthly',
            buildingIds: ['building-1'],
            floorIds: ['floor-1'],
            areaIds: ['area-1'],
            nextDue: new Date('2026-05-01T00:00:00.000Z'),
            assignedUsers: ['perm-1'],
            status: 'overdue',
            category: 'training',
            isRecurring: false,
            recurrencePattern: 'none',
            reminderDaysBefore: 1,
            trainingDetails: {
              participantId: 'perm-1',
              participantName: 'Admin User',
              certificateType: 'fire_marshall',
              certificateLabel: 'Fire Marshall',
              level: '1',
              assignedDate: new Date('2026-05-01T00:00:00.000Z'),
            },
          },
        ],
        safetyCheckItems: [],
        complianceCategories: [],
        customIncidentFields: [],
        checkTypeFields: [],
        healthOfficialsRequiredDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      },
      updateComplianceCheck: vi.fn(),
      updateUserPermission: vi.fn(),
      bulkAddUserPermissions: vi.fn(),
      deleteUserPermission: vi.fn(),
    });

    mockUseDrillStatus.mockReturnValue({
      activeDrill: null,
      drillRecords: [],
      isCheckInEnabled: false,
    });

    mockUseOfficeAttendance.mockReturnValue({
      personnelInOfficeToday: 1,
    });

    mockLoadIncidentsFromStorage.mockReturnValue([]);
    mockSaveIncidentsToStorage.mockReset();
    mockLoadDrillsFromStorage.mockReturnValue([]);
    mockSaveDrillsToStorage.mockReset();
    mockGetDrillsStorageSnapshot.mockReturnValue('[]');
    mockUpsertCertificateForTrainingPass.mockReset();
  });

  it('opens pending overdue training from dashboard, starts it, and persists the completed training record', async () => {
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Safety Compliance' }));
    fireEvent.click(screen.getByRole('button', { name: 'View Overdue Training' }));

    expect(await screen.findByText('Pending Training Assignments')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Start' })[0]);

    expect(await screen.findByText('Complete Compliance Check')).toBeInTheDocument();
    expect(screen.getByText('Completing scheduled check:')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Complete Check' }));
    expect(await screen.findByText('Confirm Passed Training')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm And Complete' }));

    await waitFor(() => {
      const completed = localStorage.getItem('safeguard_completed_checks');
      expect(completed).not.toBeNull();
      const records = JSON.parse(completed || '[]');
      expect(records).toHaveLength(1);
      expect(records[0]).toEqual(
        expect.objectContaining({
          checkType: 'training',
          status: 'pass',
        }),
      );
    });

    expect(mockUpsertCertificateForTrainingPass).toHaveBeenCalledTimes(1);
  });
});