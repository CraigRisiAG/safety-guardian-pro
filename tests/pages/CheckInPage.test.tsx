import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CheckIn from '@/pages/CheckIn';

const mockUseDrillStatus = vi.fn();
const mockUseAdminSettings = vi.fn();
const mockUseAuth = vi.fn();
const mockLoadCheckInsForDrill = vi.fn();

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  addCheckInsToStorage: vi.fn(),
  getCheckInsStorageSnapshot: vi.fn(() => null),
  loadCheckInsForDrill: (...args: unknown[]) => mockLoadCheckInsForDrill(...args),
}));

vi.mock('@/lib/auditLog', () => ({
  logAuditEvent: vi.fn(),
}));

describe('CheckIn page', () => {
  beforeEach(() => {
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
});
