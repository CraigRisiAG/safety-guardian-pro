import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MissedComplianceReport } from '@/components/admin/MissedComplianceReport';

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

describe('MissedComplianceReport', () => {
  beforeEach(() => {
    localStorage.clear();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();

    Object.defineProperty(window, 'URL', {
      value: {
        createObjectURL: vi.fn(() => 'blob:report'),
        revokeObjectURL: vi.fn(),
      },
      writable: true,
    });
  });

  const users = [
    {
      id: 'u-1',
      userId: 'auth-1',
      userName: 'Alex',
      email: 'alex@example.com',
      role: 'reporter' as const,
      buildingAccess: ['b-1'],
      primaryFloorId: 'f-1',
      primaryAreaId: 'a-1',
      workDays: ['monday'] as const,
      safetyRoles: ['fire_marshall'] as const,
      canStartDrills: false,
      canResolveIncidents: true,
      canManageUsers: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  ];

  const buildings = [
    {
      id: 'b-1',
      name: 'HQ',
      floors: [
        {
          id: 'f-1',
          buildingId: 'b-1',
          name: 'Floor 1',
          level: 1,
          areas: [{ id: 'a-1', floorId: 'f-1', name: 'North Wing' }],
        },
      ],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  ];

  it('renders missed records from storage', () => {
    localStorage.setItem(
      'safeguard_missed_compliance_records',
      JSON.stringify([
        {
          id: 'missed-1',
          checkId: 'check-1',
          checkName: 'Fire panel check',
          dueAt: '2026-05-01T09:00:00.000Z',
          loggedAt: '2026-05-02T09:00:00.000Z',
          category: 'fire-safety',
          buildingIds: ['b-1'],
          floorIds: ['f-1'],
          areaIds: ['a-1'],
          assignedUserIds: ['u-1'],
          assignedSafetyRoles: ['fire_marshall'],
          status: 'incomplete',
        },
      ]),
    );

    render(<MissedComplianceReport users={users} buildings={buildings} />);

    expect(screen.getByText('Missed Compliance Report')).toBeInTheDocument();
    expect(screen.getByText('Fire panel check')).toBeInTheDocument();
    expect(screen.getByText(/missed records/i)).toBeInTheDocument();
  });

  it('shows error toast when exporting without rows', () => {
    render(<MissedComplianceReport users={users} buildings={buildings} />);

    fireEvent.click(screen.getByRole('button', { name: 'Download CSV' }));
    expect(mockToastError).toHaveBeenCalledWith('No missed compliance records to download');
  });
});
