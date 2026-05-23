import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Incidents from '@/pages/Incidents';

const mockUseAdminSettings = vi.fn();
const mockUseAuth = vi.fn();
const mockLoadIncidentsFromStorage = vi.fn();
const mockSaveIncidentsToStorage = vi.fn();

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/hooks/useAdminSettings', () => ({
  useAdminSettings: () => mockUseAdminSettings(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/lib/incidentsStorage', () => ({
  loadIncidentsFromStorage: () => mockLoadIncidentsFromStorage(),
  saveIncidentsToStorage: (...args: unknown[]) => mockSaveIncidentsToStorage(...args),
}));

vi.mock('@/lib/auditLog', () => ({
  logAuditEvent: vi.fn(),
}));

vi.mock('recharts', () => {
  const Mock = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Mock,
    BarChart: Mock,
    Bar: Mock,
    Line: Mock,
    CartesianGrid: Mock,
    XAxis: Mock,
    YAxis: Mock,
    Tooltip: Mock,
    Legend: Mock,
  };
});

describe('Incidents page', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'admin-1',
        email: 'admin@safeguard.local',
        name: 'Admin User',
        role: 'admin',
      },
    });

    mockUseAdminSettings.mockReturnValue({
      settings: {
        customIncidentFields: [],
        buildings: [
          {
            id: 'b-1',
            name: 'Main Office',
            floors: [
              {
                id: 'f-1',
                name: 'Ground Floor',
                areas: [{ id: 'a-1', name: 'Reception', floorId: 'f-1' }],
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
            buildingAccess: ['b-1'],
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

    mockLoadIncidentsFromStorage.mockReturnValue([
      {
        id: 'incident-1',
        title: 'Wet floor by lobby',
        description: 'Slip hazard observed',
        severity: 'low',
        status: 'open',
        location: {
          buildingId: 'b-1',
          floorId: 'f-1',
          areaId: 'a-1',
        },
        reportedBy: 'Admin User',
        reportedAt: new Date('2026-05-10T08:00:00.000Z'),
        statusDates: {
          openAt: new Date('2026-05-10T08:00:00.000Z'),
        },
      },
    ]);
  });

  it('renders key incident management sections and data', () => {
    render(<Incidents />);

    expect(screen.getByText('Incident Management')).toBeInTheDocument();
    expect(screen.getByText('Incident Statistics & Reports')).toBeInTheDocument();
    expect(screen.getByText('Wet floor by lobby')).toBeInTheDocument();
    expect(mockSaveIncidentsToStorage).toHaveBeenCalled();
  });

  it('supports search filtering, chart mode toggles, and empty-state branch', () => {
    render(<Incidents />);

    fireEvent.change(screen.getByPlaceholderText('Search incidents...'), {
      target: { value: 'no-match-query' },
    });
    expect(screen.getByText('No incidents found')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search incidents...'), {
      target: { value: 'wet floor' },
    });
    expect(screen.getByText('Wet floor by lobby')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /By Severity/i }));
    fireEvent.click(screen.getByRole('button', { name: /By Status/i }));
    expect(screen.getByText(/Reporting period:/i)).toBeInTheDocument();
  });
});
