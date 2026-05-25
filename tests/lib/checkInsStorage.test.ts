import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHECK_INS_STORAGE_KEY,
  addCheckInsToStorage,
  getCheckInsStorageSnapshot,
  loadCheckInsForDrill,
  loadCheckInsFromStorage,
  saveCheckInsToStorage,
} from '@/lib/checkInsStorage';
import { SafetyCheckIn } from '@/types/safety';

const sampleCheckIns: SafetyCheckIn[] = [
  {
    id: 'checkin-1',
    drillId: 'drill-1',
    personName: 'Alex Brown',
    status: 'safe',
    location: {
      buildingId: 'building-1',
      floorId: 'floor-1',
      areaId: 'area-1',
    },
    checkedInAt: new Date('2026-05-25T09:00:00.000Z'),
  },
  {
    id: 'checkin-2',
    drillId: 'drill-2',
    personName: 'Sam Lee',
    status: 'needs-assistance',
    location: {
      buildingId: 'building-1',
      floorId: 'floor-2',
      areaId: 'area-3',
    },
    checkedInAt: new Date('2026-05-25T09:10:00.000Z'),
  },
];

describe('checkInsStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads check-ins with Date rehydration', () => {
    saveCheckInsToStorage(sampleCheckIns);

    const loaded = loadCheckInsFromStorage();

    expect(loaded).toHaveLength(2);
    expect(loaded[0].id).toBe('checkin-1');
    expect(loaded[0].checkedInAt).toBeInstanceOf(Date);
    expect(loaded[0].checkedInAt?.toISOString()).toBe('2026-05-25T09:00:00.000Z');
  });

  it('returns empty array for missing, invalid, or non-array storage', () => {
    expect(loadCheckInsFromStorage()).toEqual([]);

    localStorage.setItem(CHECK_INS_STORAGE_KEY, '{not-json');
    expect(loadCheckInsFromStorage()).toEqual([]);

    localStorage.setItem(CHECK_INS_STORAGE_KEY, JSON.stringify({ not: 'array' }));
    expect(loadCheckInsFromStorage()).toEqual([]);
  });

  it('filters check-ins by drill id', () => {
    saveCheckInsToStorage(sampleCheckIns);

    const drill1 = loadCheckInsForDrill('drill-1');

    expect(drill1).toHaveLength(1);
    expect(drill1[0].id).toBe('checkin-1');
  });

  it('prepends new entries when adding to storage', () => {
    saveCheckInsToStorage([sampleCheckIns[1]]);

    addCheckInsToStorage([sampleCheckIns[0]]);

    const loaded = loadCheckInsFromStorage();
    expect(loaded).toHaveLength(2);
    expect(loaded[0].id).toBe('checkin-1');
    expect(loaded[1].id).toBe('checkin-2');
  });

  it('returns raw storage snapshot and handles storage errors gracefully', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('write blocked');
    });
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('read blocked');
    });

    expect(() => saveCheckInsToStorage(sampleCheckIns)).not.toThrow();
    expect(loadCheckInsFromStorage()).toEqual([]);
    expect(getCheckInsStorageSnapshot()).toBeNull();

    setItemSpy.mockRestore();
    getItemSpy.mockRestore();
  });
});
