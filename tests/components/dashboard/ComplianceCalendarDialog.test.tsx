import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ComplianceCalendarDialog } from '@/components/dashboard/ComplianceCalendarDialog';

const mockUseAuth = vi.fn();
const mockUseAdminSettings = vi.fn();
const mockUseCertificates = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/useAdminSettings', () => ({
  useAdminSettings: () => mockUseAdminSettings(),
}));

vi.mock('@/hooks/useCertificates', () => ({
  useCertificates: () => mockUseCertificates(),
}));

vi.mock('./QuickCheckAssignment', () => ({
  QuickCheckAssignment: () => null,
}));

describe('ComplianceCalendarDialog training completion visibility', () => {
  it('shows passed training as completed and not assigned in calendar day details', async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const eventDate = new Date(year, now.getMonth(), now.getDate(), 12, 0, 0);
    const localIsoNow = `${year}-${month}-${day}T12:00:00`;

    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
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
            userId: 'user-1',
            userName: 'Admin User',
            email: 'admin@safeguard.local',
            role: 'super_admin',
            buildingAccess: ['building-1'],
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
            description: 'Assigned training',
            frequency: 'monthly',
            buildingIds: ['building-1'],
            floorIds: ['floor-1'],
            areaIds: ['area-1'],
            nextDue: eventDate,
            assignedUsers: ['perm-1'],
            status: 'completed',
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
            },
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

    localStorage.setItem(
      'safeguard_completed_checks',
      JSON.stringify([
        {
          id: 'completed-1',
          checkType: 'training',
          buildingId: 'building-1',
          floorId: 'floor-1',
          completedBy: {
            userId: 'user-1',
            userName: 'Admin User',
            email: 'admin@safeguard.local',
          },
          completedAt: localIsoNow,
          checkItems: [],
          status: 'pass',
          notes: 'Passed successfully',
        },
      ]),
    );

    render(<ComplianceCalendarDialog onStartCheck={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Compliance Calendar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));

    expect(await screen.findByText(/Completed/)).toBeInTheDocument();
    expect(screen.getByText('pass')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start Check' })).not.toBeInTheDocument();
  });
});
