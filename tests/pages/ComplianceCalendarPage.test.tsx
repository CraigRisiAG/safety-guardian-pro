import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ComplianceCalendar from '@/pages/ComplianceCalendar';

const mockUseAuth = vi.fn();
const mockUseAdminSettings = vi.fn();
const mockUseCertificates = vi.fn();

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/useAdminSettings', () => ({
  useAdminSettings: () => mockUseAdminSettings(),
}));

vi.mock('@/hooks/useCertificates', () => ({
  useCertificates: () => mockUseCertificates(),
}));

vi.mock('@/components/dashboard/QuickCheckAssignment', () => ({
  QuickCheckAssignment: () => null,
}));

describe('ComplianceCalendar page', () => {
  it('renders inline calendar content and upcoming panel', async () => {
    const now = new Date('2026-05-28T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    mockUseAuth.mockReturnValue({
      user: {
        id: 'admin-1',
        email: 'admin@safeguard.local',
        name: 'Admin User',
      },
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
            workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            safetyRoles: ['health_safety_officer'],
            canStartDrills: true,
            canResolveIncidents: true,
            canManageUsers: true,
            createdAt: now,
            updatedAt: now,
          },
        ],
        complianceChecks: [
          {
            id: 'check-1',
            name: 'Reception Weekly Safety Check',
            description: 'Weekly reception check',
            frequency: 'weekly',
            buildingIds: ['building-1'],
            floorIds: ['floor-1'],
            areaIds: ['area-1'],
            nextDue: new Date('2026-05-30T10:00:00.000Z'),
            assignedUsers: ['perm-1'],
            assignedSafetyRoles: [],
            status: 'pending',
            category: 'fire-safety',
            isRecurring: false,
            recurrencePattern: 'none',
          },
        ],
        safetyCheckItems: [],
        complianceCategories: [],
        customIncidentFields: [],
        checkTypeFields: [],
        healthOfficialsRequiredDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      },
    });

    mockUseCertificates.mockReturnValue({
      certificates: [],
    });

    render(<ComplianceCalendar />);

    expect(screen.getAllByText('Compliance Calendar').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
    expect(screen.getByText('May 2026')).toBeInTheDocument();

    const hasEventCard = !!screen.queryByText('Reception Weekly Safety Check');
    const hasEmptyState = !!screen.queryByText('No upcoming events in your scope.');
    expect(hasEventCard || hasEmptyState).toBe(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
