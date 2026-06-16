import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CheckIn from '@/pages/CheckIn';

const mockUseDrillStatus = vi.fn();
const mockUseAdminSettings = vi.fn();
const mockUseAuth = vi.fn();
const mockLoadCheckInsForDrill = vi.fn();
const mockAddCheckInsToStorage = vi.fn();
const mockGetCheckInsStorageSnapshot = vi.fn();
const mockLogAuditEvent = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockToastInfo = vi.fn();

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/checkin/SafetyCheckInCard', () => ({
  SafetyCheckInCard: ({ onCheckIn }: { onCheckIn: (payload: {
    status: 'safe' | 'needs-assistance';
    floorId: string;
    areaId: string;
    notes?: string;
    userType?: 'guest' | 'staff';
    staffCode?: string;
    personName?: string;
    additionalPeople?: Array<{ name: string; status: 'safe' | 'needs-assistance'; staffCode?: string; personnelId?: string }>;
  }) => void }) => (
    <button
      type="button"
      onClick={() =>
        onCheckIn({
          status: 'safe',
          floorId: 'floor-1',
          areaId: 'area-1',
          notes: 'All clear',
          additionalPeople: [
            {
              name: 'Colleague One',
              status: 'safe',
              personnelId: 'colleague-1',
            },
          ],
        })
      }
    >
      Mock Submit Check-In
    </button>
  ),
}));

vi.mock('@/components/checkin/FloorCheckInProgress', () => ({
  FloorCheckInProgress: () => <div>Floor progress widget</div>,
}));

vi.mock('@/hooks/useDrillStatus', () => ({
  useDrillStatus: () => mockUseDrillStatus(),
}));

vi.mock('@/hooks/useAdminSettings', () => ({
  useAdminSettings: () => mockUseAdminSettings(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/lib/checkInsStorage', () => ({
  addCheckInsToStorage: (...args: unknown[]) => mockAddCheckInsToStorage(...args),
  getCheckInsStorageSnapshot: () => mockGetCheckInsStorageSnapshot(),
  loadCheckInsForDrill: (...args: unknown[]) => mockLoadCheckInsForDrill(...args),
}));

vi.mock('@/lib/auditLog', () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
    info: (...args: unknown[]) => mockToastInfo(...args),
  },
}));

describe('CheckIn page', () => {
  beforeEach(() => {
    mockAddCheckInsToStorage.mockReset();
    mockGetCheckInsStorageSnapshot.mockReset();
    mockGetCheckInsStorageSnapshot.mockReturnValue(null);
    mockLogAuditEvent.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
    mockToastInfo.mockReset();
    mockLoadCheckInsForDrill.mockReturnValue([]);

    mockUseDrillStatus.mockReturnValue({
      activeDrill: null,
    });

    mockUseAdminSettings.mockReturnValue({
      settings: {
        buildings: [],
        userPermissions: [],
      },
    });

    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User One',
        role: 'user',
      },
    });
  });

  it('shows empty-state message when there is no active drill', () => {
    render(<CheckIn />);

    expect(screen.getByText('No Active Drill')).toBeInTheDocument();
    expect(screen.getByText('There is currently no drill in progress')).toBeInTheDocument();
  });

  it('shows checked-in state for active drill when user has self check-in entry', () => {
    mockUseDrillStatus.mockReturnValue({
      activeDrill: {
        id: 'drill-1',
        type: 'fire',
        status: 'active',
        location: {
          buildingId: 'building-1',
          buildingIds: ['building-1'],
          floorIds: ['floor-1'],
          areaIds: ['area-1'],
        },
        startedAt: new Date('2026-05-23T10:00:00.000Z'),
        initiatedBy: 'Safety Lead',
      },
    });

    mockUseAdminSettings.mockReturnValue({
      settings: {
        buildings: [
          {
            id: 'building-1',
            name: 'Main Office',
            floors: [
              {
                id: 'floor-1',
                name: 'Ground Floor',
                areas: [{ id: 'area-1', name: 'Reception' }],
              },
            ],
          },
        ],
        userPermissions: [
          {
            id: 'perm-1',
            userId: 'user-1',
            userName: 'User One',
            email: 'user@example.com',
            role: 'responder',
            buildingAccess: ['building-1'],
            primaryFloorId: 'floor-1',
            primaryAreaId: 'area-1',
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

    mockLoadCheckInsForDrill.mockReturnValue([
      {
        id: 'checkin-1',
        drillId: 'drill-1',
        personName: 'User One',
        personnelId: 'user-1',
        isSelfCheckIn: true,
        checkedInByUserId: 'user-1',
        status: 'safe',
        location: {
          buildingId: 'building-1',
          floorId: 'floor-1',
          areaId: 'area-1',
        },
        checkedInAt: new Date('2026-05-23T10:02:00.000Z'),
      },
    ]);

    render(<CheckIn />);

    expect(screen.getByText("You're Checked In!")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Check In Another Person/i })).toBeInTheDocument();
  });

  it('handles self check-in submission, shows manager panel, and validates colleague form', () => {
    mockUseDrillStatus.mockReturnValue({
      activeDrill: {
        id: 'drill-1',
        type: 'fire',
        status: 'active',
        location: {
          buildingId: 'building-1',
          buildingIds: ['building-1'],
          floorIds: ['floor-1'],
          areaIds: ['area-1'],
        },
        startedAt: new Date('2026-05-23T10:00:00.000Z'),
        initiatedBy: 'Safety Lead',
      },
    });

    mockUseAdminSettings.mockReturnValue({
      settings: {
        buildings: [
          {
            id: 'building-1',
            name: 'Main Office',
            floors: [
              {
                id: 'floor-1',
                name: 'Ground Floor',
                areas: [{ id: 'area-1', name: 'Reception' }],
              },
            ],
          },
        ],
        userPermissions: [
          {
            id: 'perm-1',
            userId: 'user-1',
            userName: 'User One',
            email: 'user@example.com',
            role: 'responder',
            buildingAccess: ['building-1'],
            primaryFloorId: 'floor-1',
            primaryAreaId: 'area-1',
            workDays: ['monday'],
            safetyRoles: [],
            canStartDrills: true,
            canResolveIncidents: true,
            canManageUsers: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
          {
            id: 'colleague-1',
            userId: 'colleague-1',
            userName: 'Colleague One',
            email: 'colleague@example.com',
            role: 'viewer',
            buildingAccess: ['building-1'],
            primaryFloorId: 'floor-1',
            primaryAreaId: 'area-1',
            workDays: ['monday'],
            safetyRoles: [],
            canStartDrills: false,
            canResolveIncidents: false,
            canManageUsers: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
      },
    });

    render(<CheckIn />);

    fireEvent.click(screen.getByRole('button', { name: 'Mock Submit Check-In' }));

    expect(mockAddCheckInsToStorage).toHaveBeenCalledTimes(1);
    expect(mockLogAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'submit_checkin' }));
    expect(mockToastSuccess).toHaveBeenCalled();
    expect(screen.getByText("You're Checked In!")).toBeInTheDocument();
    expect(screen.getByText('Drill Manager View')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Check In Another Person/i }));
    fireEvent.click(screen.getByRole('button', { name: /Save Check-In/i }));

    expect(mockToastError).toHaveBeenCalledWith('Select floor and section');
  });

  it('highlights unaccounted people who need additional assistance', () => {
    mockUseDrillStatus.mockReturnValue({
      activeDrill: {
        id: 'drill-2',
        type: 'fire',
        status: 'active',
        location: {
          buildingId: 'building-1',
          buildingIds: ['building-1'],
          floorIds: ['floor-1'],
          areaIds: ['area-1'],
        },
        startedAt: new Date('2026-05-23T10:00:00.000Z'),
        initiatedBy: 'Safety Lead',
      },
    });

    mockUseAdminSettings.mockReturnValue({
      settings: {
        buildings: [
          {
            id: 'building-1',
            name: 'Main Office',
            floors: [
              {
                id: 'floor-1',
                name: 'Ground Floor',
                areas: [{ id: 'area-1', name: 'Reception' }],
              },
            ],
          },
        ],
        userPermissions: [
          {
            id: 'perm-1',
            userId: 'user-1',
            userName: 'User One',
            email: 'user@example.com',
            role: 'responder',
            buildingAccess: ['building-1'],
            primaryFloorId: 'floor-1',
            primaryAreaId: 'area-1',
            workDays: ['monday'],
            safetyRoles: [],
            canStartDrills: true,
            canResolveIncidents: true,
            canManageUsers: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
          {
            id: 'perm-2',
            userId: 'colleague-2',
            userName: 'Needs Help Colleague',
            email: 'needs-help@example.com',
            requiresAdditionalAssistance: true,
            role: 'viewer',
            buildingAccess: ['building-1'],
            primaryFloorId: 'floor-1',
            primaryAreaId: 'area-1',
            workDays: ['monday'],
            safetyRoles: [],
            canStartDrills: false,
            canResolveIncidents: false,
            canManageUsers: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
      },
    });

    mockLoadCheckInsForDrill.mockReturnValue([]);

    render(<CheckIn />);

    expect(screen.getByText('Unaccounted personnel (2)')).toBeInTheDocument();
    expect(screen.getByText('Needs Help Colleague')).toBeInTheDocument();
    expect(screen.getByText('Needs Additional Assistance')).toBeInTheDocument();
  });
});
