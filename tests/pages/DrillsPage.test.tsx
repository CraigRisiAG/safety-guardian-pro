import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Drills from '@/pages/Drills';

const mockUseDrillStatus = vi.fn();
const mockUseAdminSettings = vi.fn();
const mockUseAuth = vi.fn();
const mockLoadDrillsFromStorage = vi.fn();
const mockSaveDrillsToStorage = vi.fn();

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

vi.mock('@/lib/drillsStorage', () => ({
  loadDrillsFromStorage: () => mockLoadDrillsFromStorage(),
  saveDrillsToStorage: (...args: unknown[]) => mockSaveDrillsToStorage(...args),
}));

vi.mock('@/lib/auditLog', () => ({
  logAuditEvent: vi.fn(),
}));

describe('Drills page', () => {
  beforeEach(() => {
    mockLoadDrillsFromStorage.mockReturnValue([]);
    mockUseDrillStatus.mockReturnValue({
      startDrill: vi.fn(),
      endDrill: vi.fn(),
      drillRecords: [],
    });
    mockUseAdminSettings.mockReturnValue({
      settings: {
        buildings: [],
        userPermissions: [],
      },
    });
    mockUseAuth.mockReturnValue({
      user: null,
    });
  });

  it('renders drill management page sections without crashing', () => {
    render(<Drills />);

    expect(screen.getByText('Drill Management')).toBeInTheDocument();
    expect(screen.getByText('History & Stats')).toBeInTheDocument();
    expect(screen.getByText('No drills found')).toBeInTheDocument();
    expect(mockSaveDrillsToStorage).toHaveBeenCalledWith([]);
  });

  it('renders scheduled drill cards and history tab content', () => {
    const startDrillMock = vi.fn();

    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Safety Lead',
        role: 'admin',
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
            userName: 'Safety Lead',
            email: 'user@example.com',
            role: 'super_admin',
            buildingAccess: ['building-1'],
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

    mockLoadDrillsFromStorage.mockReturnValue([
      {
        id: 'drill-1',
        type: 'evacuation',
        status: 'scheduled',
        location: {
          buildingId: 'building-1',
          buildingIds: ['building-1'],
          floorIds: ['floor-1'],
          areaIds: ['area-1'],
        },
        scheduledFor: new Date('2026-06-01T08:00:00.000Z'),
        initiatedBy: 'Safety Lead',
      },
    ]);

    mockUseDrillStatus.mockReturnValue({
      startDrill: startDrillMock,
      endDrill: vi.fn(),
      drillRecords: [
        {
          id: 'record-1',
          drillId: 'drill-1',
          type: 'evacuation',
          buildingId: 'building-1',
          buildingName: 'Main Office',
          floors: [{ id: 'floor-1', name: 'Ground Floor' }],
          startedAt: new Date('2026-06-01T08:00:00.000Z'),
          completedAt: new Date('2026-06-01T08:12:00.000Z'),
          durationMinutes: 12,
          initiatedBy: 'Safety Lead',
          checkInStats: { total: 10, safe: 8, needsAssistance: 1, pending: 1 },
          floorStats: [],
        },
      ],
    });

    render(<Drills />);

    expect(screen.getByText('Evacuation Drill')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Start Now/i }));
    expect(startDrillMock).toHaveBeenCalledTimes(1);
  });
});
