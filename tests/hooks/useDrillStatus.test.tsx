import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDrillStatus } from '@/hooks/useDrillStatus';
import type { Drill } from '@/types/safety';

const mockLoadCheckInsForDrill = vi.fn();
const mockLoadDrillsFromStorage = vi.fn();
const mockSaveDrillsToStorage = vi.fn();

vi.mock('@/lib/checkInsStorage', () => ({
  loadCheckInsForDrill: (...args: unknown[]) => mockLoadCheckInsForDrill(...args),
}));

vi.mock('@/lib/drillsStorage', () => ({
  loadDrillsFromStorage: (...args: unknown[]) => mockLoadDrillsFromStorage(...args),
  saveDrillsToStorage: (...args: unknown[]) => mockSaveDrillsToStorage(...args),
}));

const baseDrill: Drill = {
  id: 'drill-1',
  type: 'fire',
  status: 'scheduled',
  location: {
    buildingId: 'building-main',
    floorIds: ['floor-ground'],
    areaIds: ['area-reception'],
  },
  initiatedBy: 'Safety Officer',
};

describe('useDrillStatus', () => {
  beforeEach(() => {
    localStorage.clear();
    mockLoadCheckInsForDrill.mockReset();
    mockLoadDrillsFromStorage.mockReset();
    mockSaveDrillsToStorage.mockReset();
    mockLoadDrillsFromStorage.mockReturnValue([]);
    mockLoadCheckInsForDrill.mockReturnValue([]);
  });

  it('starts a drill and enables check-in state', () => {
    const { result } = renderHook(() => useDrillStatus());

    act(() => {
      result.current.startDrill(baseDrill);
    });

    expect(result.current.activeDrill?.id).toBe('drill-1');
    expect(result.current.activeDrill?.status).toBe('active');
    expect(result.current.isCheckInEnabled).toBe(true);

    const persistedActive = localStorage.getItem('active_drill');
    expect(persistedActive).toContain('"id":"drill-1"');
    expect(mockSaveDrillsToStorage).toHaveBeenCalledTimes(1);
  });

  it('ends an active drill and persists a drill record with computed stats', () => {
    const startedAt = new Date(Date.now() - 5 * 60 * 1000);
    localStorage.setItem('active_drill', JSON.stringify({ ...baseDrill, status: 'active', startedAt }));
    mockLoadDrillsFromStorage.mockReturnValue([{ ...baseDrill, status: 'active', startedAt }]);
    mockLoadCheckInsForDrill.mockReturnValue([
      {
        id: 'ci-1',
        status: 'safe',
        location: { floorId: 'floor-ground' },
      },
      {
        id: 'ci-2',
        status: 'needs-assistance',
        location: { floorId: 'floor-ground' },
      },
      {
        id: 'ci-3',
        status: 'pending',
        location: { floorId: 'floor-ground' },
      },
    ]);

    const { result } = renderHook(() => useDrillStatus());

    let endedRecord: ReturnType<typeof result.current.endDrill>;
    act(() => {
      endedRecord = result.current.endDrill();
    });

    expect(endedRecord).toBeTruthy();
    expect(endedRecord?.checkInStats).toEqual({
      total: 3,
      safe: 1,
      needsAssistance: 1,
      pending: 1,
    });
    expect(result.current.activeDrill).toBeNull();
    expect(localStorage.getItem('active_drill')).toBeNull();

    const persistedRecords = JSON.parse(localStorage.getItem('drill_records') ?? '[]');
    expect(persistedRecords).toHaveLength(1);
    expect(persistedRecords[0].drillId).toBe('drill-1');

    expect(mockSaveDrillsToStorage).toHaveBeenCalled();
    const finalSaveArg = mockSaveDrillsToStorage.mock.calls.at(-1)?.[0] ?? [];
    expect(finalSaveArg[0].status).toBe('completed');
  });

  it('resolves active drill from drills storage when dedicated storage is missing', () => {
    const activeFromList: Drill = {
      ...baseDrill,
      status: 'active',
      startedAt: new Date(),
    };
    mockLoadDrillsFromStorage.mockReturnValue([activeFromList]);

    const { result } = renderHook(() => useDrillStatus());

    expect(result.current.activeDrill?.id).toBe(activeFromList.id);
    expect(result.current.isCheckInEnabled).toBe(true);
    const persistedActive = localStorage.getItem('active_drill');
    expect(persistedActive).toContain('"status":"active"');
  });

  it('returns undefined when ending without an active drill', () => {
    const { result } = renderHook(() => useDrillStatus());

    let endedRecord: ReturnType<typeof result.current.endDrill>;
    act(() => {
      endedRecord = result.current.endDrill();
    });

    expect(endedRecord).toBeUndefined();
    expect(mockSaveDrillsToStorage).not.toHaveBeenCalled();
  });

  it('updates an existing drill entry when starting a drill already present in storage', () => {
    mockLoadDrillsFromStorage.mockReturnValue([{ ...baseDrill, status: 'scheduled' }]);
    const { result } = renderHook(() => useDrillStatus());

    act(() => {
      result.current.startDrill(baseDrill);
    });

    expect(mockSaveDrillsToStorage).toHaveBeenCalled();
    const savedDrills = mockSaveDrillsToStorage.mock.calls.at(-1)?.[0] as Drill[];
    expect(savedDrills).toHaveLength(1);
    expect(savedDrills[0].id).toBe(baseDrill.id);
    expect(savedDrills[0].status).toBe('active');
  });

  it('restores persisted drill records from storage and parses date fields', () => {
    localStorage.setItem(
      'drill_records',
      JSON.stringify([
        {
          id: 'record-1',
          drillId: 'drill-1',
          type: 'fire',
          buildingId: 'building-main',
          buildingName: 'Main Office',
          floors: [{ id: 'floor-ground', name: 'Ground Floor' }],
          startedAt: '2026-05-23T10:00:00.000Z',
          completedAt: '2026-05-23T10:10:00.000Z',
          durationMinutes: 10,
          initiatedBy: 'Safety Lead',
          checkInStats: { total: 5, safe: 4, needsAssistance: 1, pending: 0 },
          floorStats: [],
        },
      ]),
    );

    const { result } = renderHook(() => useDrillStatus());

    expect(result.current.drillRecords).toHaveLength(1);
    expect(result.current.drillRecords[0].startedAt).toBeInstanceOf(Date);
    expect(result.current.drillRecords[0].completedAt).toBeInstanceOf(Date);
    expect(result.current.drillRecords[0].drillId).toBe('drill-1');
  });

  it('falls back to empty records for invalid persisted drill record payloads', () => {
    localStorage.setItem('drill_records', '{not-json');

    const { result } = renderHook(() => useDrillStatus());

    expect(result.current.drillRecords).toEqual([]);
  });

  it('responds to storage events by syncing drill records', () => {
    localStorage.setItem(
      'active_drill',
      JSON.stringify({
        ...baseDrill,
        status: 'active',
        startedAt: new Date('2026-05-25T09:00:00.000Z').toISOString(),
      }),
    );
    localStorage.setItem('drill_records', JSON.stringify([]));

    const { result } = renderHook(() => useDrillStatus());
    expect(result.current.drillRecords).toHaveLength(0);

    localStorage.setItem(
      'drill_records',
      JSON.stringify([
        {
          id: 'record-sync-1',
          drillId: 'drill-1',
          type: 'fire',
          buildingId: 'building-main',
          buildingName: 'Main Office',
          floors: [{ id: 'floor-ground', name: 'Ground Floor' }],
          startedAt: '2026-05-25T09:00:00.000Z',
          completedAt: '2026-05-25T09:10:00.000Z',
          durationMinutes: 10,
          initiatedBy: 'Safety Lead',
          checkInStats: { total: 3, safe: 2, needsAssistance: 1, pending: 0 },
          floorStats: [],
        },
      ]),
    );

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'drill_records' }));
    });

    expect(result.current.drillRecords).toHaveLength(1);
    expect(result.current.drillRecords[0].id).toBe('record-sync-1');
  });

  it('uses provided floorCheckIns overrides when ending drills', () => {
    localStorage.setItem(
      'active_drill',
      JSON.stringify({
        ...baseDrill,
        status: 'active',
        startedAt: new Date(Date.now() - 60_000).toISOString(),
      }),
    );
    localStorage.setItem(
      'safeguard_admin_settings',
      JSON.stringify({
        buildings: [
          {
            id: 'building-main',
            name: 'Main Office',
            floors: [
              {
                id: 'floor-ground',
                name: 'Ground Floor',
                areas: [{ id: 'area-reception', name: 'Reception' }],
              },
            ],
          },
        ],
      }),
    );
    mockLoadDrillsFromStorage.mockReturnValue([{ ...baseDrill, status: 'active' }]);
    mockLoadCheckInsForDrill.mockReturnValue([
      { id: 'ci-1', status: 'safe', location: { floorId: 'floor-ground' } },
      { id: 'ci-2', status: 'needs-assistance', location: { floorId: 'floor-ground' } },
      { id: 'ci-3', status: 'pending', location: { floorId: 'floor-ground' } },
    ]);

    const { result } = renderHook(() => useDrillStatus());

    let endedRecord: ReturnType<typeof result.current.endDrill>;
    const floorOverrides = new Map([
      ['floor-ground', { safe: 7, needsAssistance: 2, pending: 1 }],
    ]);

    act(() => {
      endedRecord = result.current.endDrill(undefined, floorOverrides);
    });

    expect(endedRecord).toBeTruthy();
    expect(endedRecord?.floorStats[0]).toMatchObject({
      floorId: 'floor-ground',
      safe: 7,
      needsAssistance: 2,
      pending: 1,
    });
  });

  it('ignores unrelated storage events when syncing state', () => {
    localStorage.setItem(
      'active_drill',
      JSON.stringify({
        ...baseDrill,
        status: 'active',
        startedAt: new Date('2026-05-25T09:00:00.000Z').toISOString(),
      }),
    );
    localStorage.setItem('drill_records', JSON.stringify([]));

    const { result } = renderHook(() => useDrillStatus());
    expect(result.current.drillRecords).toHaveLength(0);

    localStorage.setItem(
      'drill_records',
      JSON.stringify([
        {
          id: 'record-unrelated-1',
          drillId: 'drill-1',
          type: 'fire',
          buildingId: 'building-main',
          buildingName: 'Main Office',
          floors: [{ id: 'floor-ground', name: 'Ground Floor' }],
          startedAt: '2026-05-25T09:00:00.000Z',
          completedAt: '2026-05-25T09:10:00.000Z',
          durationMinutes: 10,
          initiatedBy: 'Safety Lead',
          checkInStats: { total: 3, safe: 2, needsAssistance: 1, pending: 0 },
          floorStats: [],
        },
      ]),
    );

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'some_other_key' }));
    });

    expect(result.current.drillRecords).toHaveLength(0);
  });

  it('falls back on malformed admin settings and ignores non-matching floor check-ins', () => {
    localStorage.setItem(
      'active_drill',
      JSON.stringify({
        ...baseDrill,
        status: 'active',
        startedAt: new Date(Date.now() - 60_000).toISOString(),
      }),
    );
    localStorage.setItem('safeguard_admin_settings', '{bad-json');
    mockLoadDrillsFromStorage.mockReturnValue([{ ...baseDrill, status: 'active' }]);
    mockLoadCheckInsForDrill.mockReturnValue([
      { id: 'ci-1', status: 'safe', location: { floorId: 'not-in-drill-floor' } },
      { id: 'ci-2', status: 'pending', location: { floorId: 'not-in-drill-floor' } },
    ]);

    const { result } = renderHook(() => useDrillStatus());

    let endedRecord: ReturnType<typeof result.current.endDrill>;
    act(() => {
      endedRecord = result.current.endDrill();
    });

    expect(endedRecord).toBeTruthy();
    expect(endedRecord?.buildingName).toBe('Unknown');
    expect(endedRecord?.floorStats).toEqual([]);
  });
});
