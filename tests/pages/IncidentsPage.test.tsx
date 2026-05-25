import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Incidents from '@/pages/Incidents';

const mockUseAdminSettings = vi.fn();
const mockUseAuth = vi.fn();
const mockLoadIncidentsFromStorage = vi.fn();
const mockSaveIncidentsToStorage = vi.fn();
const mockLogAuditEvent = vi.fn();

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/incidents/IncidentForm', () => ({
  IncidentForm: ({ onSubmit }: { onSubmit: (data: {
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    buildingId: string;
    floorId: string;
    areaId: string;
    customFieldValues: Record<string, string | boolean | number>;
  }) => void }) => (
    <button
      type="button"
      onClick={() => onSubmit({
        title: 'Created incident title',
        description: 'Created incident description',
        severity: 'high',
        buildingId: 'b-1',
        floorId: 'f-1',
        areaId: 'a-1',
        customFieldValues: {},
      })}
    >
      Submit Mock Incident
    </button>
  ),
}));

vi.mock('@/components/incidents/IncidentEditForm', () => ({
  IncidentEditForm: ({ onSave }: { onSave: (updates: {
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'in_progress' | 'closed';
    rootCause?: string;
    customFieldValues?: Record<string, string | boolean | number>;
  }) => void }) => (
    <button
      type="button"
      onClick={() => onSave({
        title: 'Updated incident title',
        description: 'Updated description',
        severity: 'critical',
        status: 'closed',
        rootCause: 'Resolved during test',
        customFieldValues: {},
      })}
    >
      Save Mock Incident Edit
    </button>
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <button type="button" className={className} onClick={onClick}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
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
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
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
    mockLogAuditEvent.mockReset();
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

  it('supports create, edit, and delete incident flows', () => {
    render(<Incidents />);

    fireEvent.click(screen.getByText('Submit Mock Incident'));
    const afterCreate = mockSaveIncidentsToStorage.mock.calls.at(-1)?.[0] as Array<{ title: string }>;
    expect(afterCreate).toEqual(expect.arrayContaining([expect.objectContaining({ title: 'Created incident title' })]));
    expect(mockLogAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'create_incident' }));

    const incidentTitle = screen.getByText('Wet floor by lobby');
    const rowContainer = incidentTitle.closest('.transition-colors') as HTMLElement;
    const rowButtons = within(rowContainer).getAllByRole('button');
    fireEvent.click(rowButtons[0]);

    fireEvent.click(screen.getByText('Save Mock Incident Edit'));
    const afterEdit = mockSaveIncidentsToStorage.mock.calls.at(-1)?.[0] as Array<{ title: string; status: string }>;
    expect(afterEdit).toEqual(expect.arrayContaining([expect.objectContaining({ title: 'Updated incident title', status: 'closed' })]));
    expect(mockLogAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'update_incident' }));

    const updatedIncidentTitle = screen.getByText('Updated incident title');
    const updatedRowContainer = updatedIncidentTitle.closest('.transition-colors') as HTMLElement;
    const updatedRowDeleteButton = within(updatedRowContainer).getByRole('button', { name: 'Delete incident' });
    fireEvent.click(updatedRowDeleteButton);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    const afterDelete = mockSaveIncidentsToStorage.mock.calls.at(-1)?.[0] as Array<{ id: string }>;
    expect(afterDelete).toEqual(expect.arrayContaining([expect.objectContaining({ title: 'Created incident title' })]));
    expect(afterDelete).toHaveLength(1);
    expect(screen.queryByText('Updated incident title')).not.toBeInTheDocument();
    expect(mockLogAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'delete_incident' }));
  });
});
