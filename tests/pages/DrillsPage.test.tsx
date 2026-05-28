import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Drills from '@/pages/Drills';

const mockUseDrillStatus = vi.fn();
const mockUseAdminSettings = vi.fn();
const mockUseAuth = vi.fn();
const mockLoadDrillsFromStorage = vi.fn();
const mockSaveDrillsToStorage = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockToastInfo = vi.fn();
const mockUpdateDrillOperationTypes = vi.fn();
const mockUpdateDrillSuccessCriteria = vi.fn();

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

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
    info: (...args: unknown[]) => mockToastInfo(...args),
  },
}));

describe('Drills page', () => {
  beforeEach(() => {
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
    mockToastInfo.mockReset();
    mockLoadDrillsFromStorage.mockReturnValue([]);
    mockUseDrillStatus.mockReturnValue({
      startDrill: vi.fn(),
      endDrill: vi.fn(),
      drillRecords: [],
    });
    mockUpdateDrillOperationTypes.mockReset();
    mockUpdateDrillSuccessCriteria.mockReset();
    mockUseAdminSettings.mockReturnValue({
      settings: {
        buildings: [],
        userPermissions: [],
      },
      updateDrillOperationTypes: mockUpdateDrillOperationTypes,
      updateDrillSuccessCriteria: mockUpdateDrillSuccessCriteria,
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

  it('covers missed and scheduled tabs plus history date-range empty branch', () => {
    const now = Date.now();

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
        id: 'drill-missed',
        type: 'fire',
        status: 'scheduled',
        location: {
          buildingId: 'building-1',
          buildingIds: ['building-1'],
          floorIds: ['floor-1'],
          areaIds: ['area-1'],
        },
        scheduledFor: new Date(now - 3 * 24 * 60 * 60 * 1000),
        initiatedBy: 'Safety Lead',
      },
      {
        id: 'drill-upcoming',
        type: 'evacuation',
        status: 'scheduled',
        location: {
          buildingId: 'building-1',
          buildingIds: ['building-1'],
          floorIds: ['floor-1'],
          areaIds: ['area-1'],
        },
        scheduledFor: new Date(now + 3 * 24 * 60 * 60 * 1000),
        initiatedBy: 'Safety Lead',
      },
    ]);

    mockUseDrillStatus.mockReturnValue({
      startDrill: vi.fn(),
      endDrill: vi.fn(),
      drillRecords: [
        {
          id: 'record-1',
          drillId: 'drill-upcoming',
          type: 'evacuation',
          buildingId: 'building-1',
          buildingName: 'Main Office',
          floors: [{ id: 'floor-1', name: 'Ground Floor' }],
          startedAt: new Date('2026-01-01T08:00:00.000Z'),
          completedAt: new Date('2026-01-01T08:10:00.000Z'),
          durationMinutes: 10,
          initiatedBy: 'Safety Lead',
          checkInStats: { total: 10, safe: 9, needsAssistance: 1, pending: 0 },
          floorStats: [],
        },
      ],
    });

    const { container } = render(<Drills />);

    const missedTab = screen.getByRole('tab', { name: 'Missed' });
    fireEvent.mouseDown(missedTab, { button: 0, ctrlKey: false });
    expect(missedTab).toHaveAttribute('aria-selected', 'true');

    const scheduledTab = screen.getByRole('tab', { name: 'Scheduled' });
    fireEvent.mouseDown(scheduledTab, { button: 0, ctrlKey: false });
    expect(scheduledTab).toHaveAttribute('aria-selected', 'true');

    fireEvent.mouseDown(screen.getByRole('tab', { name: /History & Stats/i }), { button: 0, ctrlKey: false });
    const dateInputs = container.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(2);

    fireEvent.change(dateInputs[0], { target: { value: '2030-01-01' } });
    fireEvent.change(dateInputs[1], { target: { value: '2030-01-31' } });

    expect(screen.getByText(/No drill records in selected range/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Download CSV/i }));
    fireEvent.click(screen.getByRole('button', { name: /Download JSON/i }));
    expect(mockToastError).toHaveBeenCalledTimes(2);
  });

  it('downloads drill history CSV and JSON when records are present', () => {
    const createObjectURLSpy = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:drills');
    const revokeObjectURLSpy = vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

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

    mockUseDrillStatus.mockReturnValue({
      startDrill: vi.fn(),
      endDrill: vi.fn(),
      drillRecords: [
        {
          id: 'record-export-1',
          drillId: 'drill-1',
          type: 'evacuation',
          buildingId: 'building-1',
          buildingName: 'Main Office',
          floors: [{ id: 'floor-1', name: 'Ground Floor' }],
          startedAt: new Date('2026-01-01T08:00:00.000Z'),
          completedAt: new Date('2026-01-01T08:12:00.000Z'),
          durationMinutes: 12,
          initiatedBy: 'Safety Lead',
          checkInStats: { total: 10, safe: 8, needsAssistance: 1, pending: 1 },
          floorStats: [],
        },
      ],
    });

    render(<Drills />);
    fireEvent.mouseDown(screen.getByRole('tab', { name: /History & Stats/i }), { button: 0, ctrlKey: false });

    fireEvent.click(screen.getByRole('button', { name: /Download CSV/i }));
    fireEvent.click(screen.getByRole('button', { name: /Download JSON/i }));

    expect(createObjectURLSpy).toHaveBeenCalledTimes(2);
    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(2);
    expect(clickSpy).toHaveBeenCalledTimes(2);
    expect(mockToastSuccess).toHaveBeenCalled();
  });

  it('highlights a completed drill as failed when accounted percentage is under 50%', () => {
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
        id: 'drill-failed-1',
        type: 'fire',
        status: 'completed',
        location: {
          buildingId: 'building-1',
          buildingIds: ['building-1'],
          floorIds: ['floor-1'],
          areaIds: ['area-1'],
        },
        startedAt: new Date('2026-05-01T08:00:00.000Z'),
        completedAt: new Date('2026-05-01T08:25:00.000Z'),
        initiatedBy: 'Safety Lead',
      },
      {
        id: 'drill-passed-1',
        type: 'evacuation',
        status: 'completed',
        location: {
          buildingId: 'building-1',
          buildingIds: ['building-1'],
          floorIds: ['floor-1'],
          areaIds: ['area-1'],
        },
        startedAt: new Date('2026-05-02T08:00:00.000Z'),
        completedAt: new Date('2026-05-02T08:12:00.000Z'),
        initiatedBy: 'Safety Lead',
      },
    ]);

    mockUseDrillStatus.mockReturnValue({
      startDrill: vi.fn(),
      endDrill: vi.fn(),
      drillRecords: [
        {
          id: 'record-failed-1',
          drillId: 'drill-failed-1',
          type: 'fire',
          buildingId: 'building-1',
          buildingName: 'Main Office',
          floors: [{ id: 'floor-1', name: 'Ground Floor' }],
          startedAt: new Date('2026-05-01T08:00:00.000Z'),
          completedAt: new Date('2026-05-01T08:10:00.000Z'),
          durationMinutes: 10,
          initiatedBy: 'Safety Lead',
          checkInStats: { total: 10, safe: 3, needsAssistance: 1, pending: 6 },
          floorStats: [],
        },
        {
          id: 'record-passed-1',
          drillId: 'drill-passed-1',
          type: 'evacuation',
          buildingId: 'building-1',
          buildingName: 'Main Office',
          floors: [{ id: 'floor-1', name: 'Ground Floor' }],
          startedAt: new Date('2026-05-02T08:00:00.000Z'),
          completedAt: new Date('2026-05-02T08:12:00.000Z'),
          durationMinutes: 12,
          initiatedBy: 'Safety Lead',
          checkInStats: { total: 10, safe: 8, needsAssistance: 1, pending: 1 },
          floorStats: [],
        },
      ],
    });

    render(<Drills />);

    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0);

    const failedTab = screen.getByRole('tab', { name: 'Failed' });
    fireEvent.mouseDown(failedTab, { button: 0, ctrlKey: false });
    expect(failedTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Fire Drill')).toBeInTheDocument();
    expect(screen.queryByText('Evacuation Drill')).not.toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('tab', { name: /History & Stats/i }), { button: 0, ctrlKey: false });
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0);
  });

  it('disables drill management actions when user lacks start permissions', () => {
    const startDrillMock = vi.fn();

    mockUseAuth.mockReturnValue({
      user: {
        id: 'viewer-1',
        email: 'viewer@example.com',
        name: 'Viewer User',
        role: 'user',
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
            id: 'perm-viewer',
            userId: 'viewer-1',
            userName: 'Viewer User',
            email: 'viewer@example.com',
            role: 'viewer',
            buildingAccess: ['building-1'],
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
      updateDrillOperationTypes: mockUpdateDrillOperationTypes,
      updateDrillSuccessCriteria: mockUpdateDrillSuccessCriteria,
    });

    mockLoadDrillsFromStorage.mockReturnValue([
      {
        id: 'drill-locked',
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
      drillRecords: [],
    });

    render(<Drills />);

    expect(screen.getByRole('button', { name: /Schedule Drill/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Start Drill/i })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Start Now/i })).not.toBeInTheDocument();
    expect(startDrillMock).not.toHaveBeenCalled();
  });

  it('allows admins to add and remove operation types from operation settings', () => {
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
        buildings: [],
        userPermissions: [
          {
            id: 'perm-1',
            userId: 'user-1',
            userName: 'Safety Lead',
            email: 'user@example.com',
            role: 'super_admin',
            buildingAccess: [],
            workDays: ['monday'],
            safetyRoles: [],
            canStartDrills: true,
            canResolveIncidents: true,
            canManageUsers: true,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
        drillOperationTypes: [
          { id: 'fire', name: 'Fire Drill', category: 'drill', enabled: true },
          { id: 'evacuation', name: 'Evacuation Drill', category: 'drill', enabled: true },
        ],
      },
      updateDrillOperationTypes: mockUpdateDrillOperationTypes,
      updateDrillSuccessCriteria: mockUpdateDrillSuccessCriteria,
    });

    render(<Drills />);

    fireEvent.click(screen.getByRole('button', { name: /Operation Settings/i }));

    fireEvent.change(screen.getByPlaceholderText(/Chemical Spill Emergency/i), {
      target: { value: 'Medical Surge Drill' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(mockUpdateDrillOperationTypes).toHaveBeenCalledWith([
      { id: 'fire', name: 'Fire Drill', category: 'drill', enabled: true },
      { id: 'evacuation', name: 'Evacuation Drill', category: 'drill', enabled: true },
      { id: 'medical_surge_drill', name: 'Medical Surge Drill', category: 'drill', enabled: true },
    ]);

    const evacuationLabel = screen.getByText('Evacuation Drill');
    const evacuationRow = evacuationLabel.closest('div')?.parentElement;
    expect(evacuationRow).not.toBeNull();
    fireEvent.click(within(evacuationRow as HTMLDivElement).getByRole('button'));

    expect(mockUpdateDrillOperationTypes).toHaveBeenCalledWith([
      { id: 'fire', name: 'Fire Drill', category: 'drill', enabled: true },
    ]);
  });

  it('dispatches drill success criteria updates from operation settings inputs', () => {
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
        buildings: [],
        userPermissions: [
          {
            id: 'perm-1',
            userId: 'user-1',
            userName: 'Safety Lead',
            email: 'user@example.com',
            role: 'super_admin',
            buildingAccess: [],
            workDays: ['monday'],
            safetyRoles: [],
            canStartDrills: true,
            canResolveIncidents: true,
            canManageUsers: true,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
        drillSuccessCriteria: {
          drillPassThresholdPercent: 70,
          drillPassThresholdMinutes: 15,
        },
      },
      updateDrillOperationTypes: mockUpdateDrillOperationTypes,
      updateDrillSuccessCriteria: mockUpdateDrillSuccessCriteria,
    });

    render(<Drills />);
    fireEvent.click(screen.getByRole('button', { name: /Operation Settings/i }));

    const numberInputs = screen.getAllByRole('spinbutton');
    expect(numberInputs.length).toBeGreaterThanOrEqual(2);

    fireEvent.change(numberInputs[0], { target: { value: '82' } });
    fireEvent.change(numberInputs[1], { target: { value: '9' } });

    expect(mockUpdateDrillSuccessCriteria).toHaveBeenCalledWith({ drillPassThresholdPercent: 82 });
    expect(mockUpdateDrillSuccessCriteria).toHaveBeenCalledWith({ drillPassThresholdMinutes: 9 });
  });

  it('treats emergency reports as resolved and excludes them from failed drill tab', () => {
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
        drillSuccessCriteria: {
          drillPassThresholdPercent: 80,
          drillPassThresholdMinutes: 15,
        },
      },
      updateDrillOperationTypes: mockUpdateDrillOperationTypes,
      updateDrillSuccessCriteria: mockUpdateDrillSuccessCriteria,
    });

    mockLoadDrillsFromStorage.mockReturnValue([
      {
        id: 'drill-failed-1',
        type: 'fire',
        operationKind: 'drill',
        operationLabel: 'Fire Drill',
        status: 'completed',
        location: {
          buildingId: 'building-1',
          buildingIds: ['building-1'],
          floorIds: ['floor-1'],
          areaIds: ['area-1'],
        },
        startedAt: new Date('2026-05-01T08:00:00.000Z'),
        completedAt: new Date('2026-05-01T08:25:00.000Z'),
        initiatedBy: 'Safety Lead',
      },
      {
        id: 'emergency-1',
        type: 'chemical_spill',
        operationKind: 'emergency',
        operationLabel: 'Chemical Spill Emergency',
        status: 'completed',
        location: {
          buildingId: 'building-1',
          buildingIds: ['building-1'],
          floorIds: ['floor-1'],
          areaIds: ['area-1'],
        },
        startedAt: new Date('2026-05-03T08:00:00.000Z'),
        completedAt: new Date('2026-05-03T08:50:00.000Z'),
        initiatedBy: 'Safety Lead',
      },
    ]);

    mockUseDrillStatus.mockReturnValue({
      startDrill: vi.fn(),
      endDrill: vi.fn(),
      drillRecords: [
        {
          id: 'record-failed-1',
          drillId: 'drill-failed-1',
          type: 'fire',
          operationKind: 'drill',
          operationLabel: 'Fire Drill',
          buildingId: 'building-1',
          buildingName: 'Main Office',
          floors: [{ id: 'floor-1', name: 'Ground Floor' }],
          startedAt: new Date('2026-05-01T08:00:00.000Z'),
          completedAt: new Date('2026-05-01T08:30:00.000Z'),
          durationMinutes: 30,
          initiatedBy: 'Safety Lead',
          checkInStats: { total: 10, safe: 3, needsAssistance: 1, pending: 6 },
          floorStats: [],
        },
        {
          id: 'record-emergency-1',
          drillId: 'emergency-1',
          type: 'chemical_spill',
          operationKind: 'emergency',
          operationLabel: 'Chemical Spill Emergency',
          buildingId: 'building-1',
          buildingName: 'Main Office',
          floors: [{ id: 'floor-1', name: 'Ground Floor' }],
          startedAt: new Date('2026-05-03T08:00:00.000Z'),
          completedAt: new Date('2026-05-03T08:50:00.000Z'),
          durationMinutes: 50,
          initiatedBy: 'Safety Lead',
          checkInStats: { total: 10, safe: 1, needsAssistance: 2, pending: 7 },
          floorStats: [],
        },
      ],
    });

    render(<Drills />);

    fireEvent.mouseDown(screen.getByRole('tab', { name: /Emergency Reports/i }), { button: 0, ctrlKey: false });
    expect(screen.getByText('Chemical Spill Emergency')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Failed' }), { button: 0, ctrlKey: false });
    expect(screen.getByText('Fire Drill')).toBeInTheDocument();
    expect(screen.queryByText('Chemical Spill Emergency')).not.toBeInTheDocument();
  });
});
