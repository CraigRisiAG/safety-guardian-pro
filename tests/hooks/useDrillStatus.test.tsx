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
});
