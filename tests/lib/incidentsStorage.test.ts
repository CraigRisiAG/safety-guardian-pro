import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockIncidents } from '@/data/mockData';
import {
  INCIDENTS_STORAGE_KEY,
  INCIDENTS_UPDATED_EVENT,
  loadIncidentsFromStorage,
  saveIncidentsToStorage,
} from '@/lib/incidentsStorage';

describe('incidentsStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns and persists mock incidents when storage is empty', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    const incidents = loadIncidentsFromStorage();

    expect(incidents).toEqual(mockIncidents);
    expect(setItemSpy).toHaveBeenCalledWith(INCIDENTS_STORAGE_KEY, JSON.stringify(mockIncidents));
  });

  it('falls back to mock incidents when stored value is invalid JSON', () => {
    localStorage.setItem(INCIDENTS_STORAGE_KEY, '{bad-json');

    const incidents = loadIncidentsFromStorage();

    expect(incidents).toEqual(mockIncidents);
  });

  it('falls back to mock incidents when stored value is not an array', () => {
    localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify({ not: 'an-array' }));

    const incidents = loadIncidentsFromStorage();

    expect(incidents).toEqual(mockIncidents);
  });

  it('normalizes legacy statuses and date fields on load', () => {
    localStorage.setItem(
      INCIDENTS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'incident-legacy-1',
          title: 'Legacy investigating',
          description: 'desc',
          severity: 'medium',
          status: 'investigating',
          location: {
            buildingId: 'building-1',
            floorId: 'floor-1',
            areaId: 'area-1',
          },
          reportedBy: 'User',
          reportedAt: '2026-05-20T10:00:00.000Z',
          assignedTo: 'Safety Officer',
          actions: [],
          rootCause: 'Unknown',
          customFieldValues: {},
        },
        {
          id: 'incident-legacy-2',
          title: 'Legacy resolved',
          description: 'desc',
          severity: 'high',
          status: 'resolved',
          location: {
            buildingId: 'building-1',
            floorId: 'floor-1',
            areaId: 'area-1',
          },
          reportedBy: 'User',
          reportedAt: '2026-05-21T10:00:00.000Z',
          resolvedAt: '2026-05-22T10:00:00.000Z',
          assignedTo: 'Safety Officer',
          actions: [],
          rootCause: 'Unknown',
          customFieldValues: {},
        },
      ]),
    );

    const incidents = loadIncidentsFromStorage();

    expect(incidents).toHaveLength(2);
    expect(incidents[0].status).toBe('in_progress');
    expect(incidents[0].reportedAt).toBeInstanceOf(Date);
    expect(incidents[0].statusDates.openAt).toBeInstanceOf(Date);
    expect(incidents[0].statusDates.inProgressAt).toBeInstanceOf(Date);

    expect(incidents[1].status).toBe('closed');
    expect(incidents[1].statusDates.closedAt).toBeInstanceOf(Date);
  });

  it('saveIncidentsToStorage persists payload and dispatches update event', () => {
    const eventSpy = vi.spyOn(window, 'dispatchEvent');

    saveIncidentsToStorage(mockIncidents);

    expect(localStorage.getItem(INCIDENTS_STORAGE_KEY)).toBe(JSON.stringify(mockIncidents));
    expect(eventSpy).toHaveBeenCalledTimes(1);
    expect(eventSpy.mock.calls[0][0]).toBeInstanceOf(CustomEvent);
    expect((eventSpy.mock.calls[0][0] as CustomEvent).type).toBe(INCIDENTS_UPDATED_EVENT);
  });

  it('defaults unknown statuses to open and uses explicit statusDates when provided', () => {
    localStorage.setItem(
      INCIDENTS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'incident-unknown-status',
          title: 'Unknown status incident',
          description: 'desc',
          severity: 'low',
          status: 'unexpected-status',
          location: {
            buildingId: 'building-1',
            floorId: 'floor-1',
            areaId: 'area-1',
          },
          reportedBy: 'User',
          reportedAt: '2026-05-20T10:00:00.000Z',
          statusDates: {
            openAt: '2026-05-20T10:00:00.000Z',
            inProgressAt: '2026-05-20T10:05:00.000Z',
            closedAt: '2026-05-20T10:10:00.000Z',
          },
          assignedTo: 'Safety Officer',
          actions: [],
          rootCause: 'Unknown',
          customFieldValues: {},
        },
      ]),
    );

    const incidents = loadIncidentsFromStorage();

    expect(incidents).toHaveLength(1);
    expect(incidents[0].status).toBe('open');
    expect(incidents[0].statusDates.openAt).toBeInstanceOf(Date);
    expect(incidents[0].statusDates.inProgressAt).toBeInstanceOf(Date);
    expect(incidents[0].statusDates.closedAt).toBeInstanceOf(Date);
  });

  it('uses reportedAt as closedAt when resolved incident has no resolvedAt', () => {
    localStorage.setItem(
      INCIDENTS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'incident-resolved-no-date',
          title: 'Resolved incident',
          description: 'desc',
          severity: 'high',
          status: 'resolved',
          location: {
            buildingId: 'building-1',
            floorId: 'floor-1',
            areaId: 'area-1',
          },
          reportedBy: 'User',
          reportedAt: '2026-05-21T10:00:00.000Z',
          assignedTo: 'Safety Officer',
          actions: [],
          rootCause: 'Unknown',
          customFieldValues: {},
        },
      ]),
    );

    const incidents = loadIncidentsFromStorage();

    expect(incidents).toHaveLength(1);
    expect(incidents[0].status).toBe('closed');
    expect(incidents[0].statusDates.closedAt?.toISOString()).toBe(new Date('2026-05-21T10:00:00.000Z').toISOString());
  });
});
