import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';

vi.mock('@/hooks/useDrillStatus', () => ({
  useDrillStatus: () => ({
    isCheckInEnabled: true,
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
      initiatedBy: 'System Admin',
    },
    endDrill: vi.fn(),
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      name: 'Taylor Safety',
      role: 'admin',
    },
    isImpersonating: false,
  }),
}));

vi.mock('@/hooks/useAdminSettings', () => ({
  useAdminSettings: () => ({
    settings: {
      buildings: [
        {
          id: 'building-1',
          name: 'HQ',
          floors: [
            {
              id: 'floor-1',
              buildingId: 'building-1',
              name: 'Floor 1',
              level: 1,
              areas: [{ id: 'area-1', floorId: 'floor-1', name: 'North Wing' }],
            },
          ],
        },
      ],
      userPermissions: [
        {
          id: 'perm-1',
          userId: 'user-1',
          userName: 'Taylor Safety',
          email: 'taylor@example.com',
          role: 'super_admin',
          buildingAccess: ['building-1'],
          workDays: ['monday'],
          safetyRoles: [],
          canStartDrills: true,
          canResolveIncidents: true,
          canManageUsers: true,
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
          updatedAt: new Date('2026-05-01T00:00:00.000Z'),
        },
      ],
      complianceChecks: [],
    },
  }),
}));

vi.mock('@/lib/personnelAccess', () => ({
  findCurrentUserPermission: (user: { id: string } | null, permissions: Array<{ userId: string }>) =>
    permissions.find((entry) => entry.userId === user?.id) ?? null,
  canManageUsersForUser: () => true,
  canStartDrillsForUser: () => true,
  getScopedAreaIds: () => ['area-1'],
  isSuperAdminPermission: () => true,
}));

vi.mock('@/utils/complianceAssignments', () => ({
  resolveCheckAssignedUsers: () => [],
}));

vi.mock('@/lib/incidentsStorage', () => ({
  INCIDENTS_UPDATED_EVENT: 'safeguard_incidents_updated',
  loadIncidentsFromStorage: () => [],
}));

vi.mock('@/lib/checkInsStorage', () => ({
  loadCheckInsForDrill: () => [],
}));

vi.mock('@/components/UserMenu', () => ({
  UserMenu: () => <div data-testid="user-menu">UserMenu</div>,
}));

vi.mock('@/components/dashboard/ActiveDrillBanner', () => ({
  ActiveDrillBanner: () => <div data-testid="active-drill-banner">Active drill</div>,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ onOpenChange, children }: { onOpenChange?: (open: boolean) => void; children: unknown }) => (
    <div data-testid="dropdown-root" onClick={() => onOpenChange?.(true)}>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: unknown }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: unknown }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: unknown }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <div />,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AppLayout notification seen persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('persists notification signature with user-scoped seen key when notification menu opens', async () => {
    render(
      <MemoryRouter initialEntries={['/']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppLayout>
          <div>Dashboard</div>
        </AppLayout>
      </MemoryRouter>,
    );

    const notificationsButton = screen.getByLabelText('Notifications');
    fireEvent.click(notificationsButton);

    await waitFor(() => {
      expect(localStorage.getItem('safeguard_notifications_seen_user-1')).toBe('active-drill:drill-1');
    });
  });
});
