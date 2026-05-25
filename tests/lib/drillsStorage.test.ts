import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mockDrills } from '@/data/mockData';
import {
  DRILLS_STORAGE_KEY,
  loadDrillsFromStorage,
  saveDrillsToStorage,
  getDrillsStorageSnapshot,
} from '@/lib/drillsStorage';

describe('drillsStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns and persists mock drills when storage is empty', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    const drills = loadDrillsFromStorage();

    expect(drills).toEqual(mockDrills);
    expect(setItemSpy).toHaveBeenCalledWith(DRILLS_STORAGE_KEY, JSON.stringify(mockDrills));
  });

  it('falls back to mock drills when stored value is invalid JSON', () => {
    localStorage.setItem(DRILLS_STORAGE_KEY, '{not-json');

    const drills = loadDrillsFromStorage();

    expect(drills).toEqual(mockDrills);
  });

  it('normalizes invalid status, location arrays, and invalid date strings', () => {
    localStorage.setItem(
      DRILLS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'drill-x',
          type: 'fire',
          status: 'broken-status',
          location: {
            buildingId: 'building-1',
            floorIds: 'bad-floor-value',
            areaIds: null,
            buildingIds: 'bad-building-ids',
          },
          startedAt: 'not-a-date',
          completedAt: '2026-05-20T10:00:00.000Z',
          scheduledFor: 'also-not-a-date',
          initiatedBy: 'Safety Officer',
        },
      ]),
    );

    const drills = loadDrillsFromStorage();

    expect(drills).toHaveLength(1);
    expect(drills[0].status).toBe('scheduled');
    expect(drills[0].location.floorIds).toEqual([]);
    expect(drills[0].location.areaIds).toEqual([]);
    expect(drills[0].location.buildingIds).toBeUndefined();
    expect(drills[0].startedAt).toBeUndefined();
    expect(drills[0].scheduledFor).toBeUndefined();
    expect(drills[0].completedAt).toBeInstanceOf(Date);
  });

  it('saveDrillsToStorage and snapshot read/write the same payload', () => {
    saveDrillsToStorage(mockDrills);

    const snapshot = getDrillsStorageSnapshot();

    expect(snapshot).toBe(JSON.stringify(mockDrills));
  });

  it('falls back to mock drills when stored value is not an array', () => {
    localStorage.setItem(DRILLS_STORAGE_KEY, JSON.stringify({ not: 'array' }));

    const drills = loadDrillsFromStorage();

    expect(drills).toEqual(mockDrills);
  });

  it('normalizes missing buildingId and preserves cancelled status', () => {
    localStorage.setItem(
      DRILLS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'drill-cancelled',
          type: 'medical',
          status: 'cancelled',
          location: {
            floorIds: ['f-1'],
            areaIds: ['a-1'],
          },
          initiatedBy: 'Safety Officer',
        },
      ]),
    );

    const drills = loadDrillsFromStorage();

    expect(drills).toHaveLength(1);
    expect(drills[0].status).toBe('cancelled');
    expect(drills[0].location.buildingId).toBe('unknown-building');
  });

  it('handles storage read/write errors gracefully', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage read blocked');
    });
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage write blocked');
    });

    expect(loadDrillsFromStorage()).toEqual(mockDrills);
    expect(() => saveDrillsToStorage(mockDrills)).not.toThrow();
    expect(getDrillsStorageSnapshot()).toBeNull();

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });
});
