import { mockIncidents } from '@/data/mockData';
import { Incident } from '@/types/safety';

export const INCIDENTS_STORAGE_KEY = 'safeguard_incidents';

type RawIncident = Omit<Incident, 'reportedAt' | 'statusDates' | 'status'> & {
  reportedAt: string;
  status?: 'open' | 'investigating' | 'resolved' | 'in_progress' | 'closed' | string;
  resolvedAt?: string;
  statusDates?: {
    openAt: string;
    inProgressAt?: string;
    closedAt?: string;
  };
};

function mapLegacyStatus(status?: RawIncident['status']): Incident['status'] {
  if (status === 'investigating') {
    return 'in_progress';
  }

  if (status === 'resolved') {
    return 'closed';
  }

  if (status === 'closed' || status === 'in_progress' || status === 'open') {
    return status;
  }

  return 'open';
}

function parseIncident(raw: RawIncident): Incident {
  const status = mapLegacyStatus(raw.status);
  const reportedAt = new Date(raw.reportedAt);

  const statusDates = raw.statusDates
    ? {
        openAt: new Date(raw.statusDates.openAt),
        inProgressAt: raw.statusDates.inProgressAt ? new Date(raw.statusDates.inProgressAt) : undefined,
        closedAt: raw.statusDates.closedAt ? new Date(raw.statusDates.closedAt) : undefined,
      }
    : {
        openAt: reportedAt,
        inProgressAt: status === 'in_progress' || status === 'closed' ? reportedAt : undefined,
        closedAt: status === 'closed' ? (raw.resolvedAt ? new Date(raw.resolvedAt) : reportedAt) : undefined,
      };

  return {
    ...raw,
    status,
    reportedAt,
    statusDates,
  };
}

function isIncidentArray(value: unknown): value is RawIncident[] {
  return Array.isArray(value);
}

export function saveIncidentsToStorage(incidents: Incident[]) {
  localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(incidents));
}

export function loadIncidentsFromStorage(): Incident[] {
  const stored = localStorage.getItem(INCIDENTS_STORAGE_KEY);

  if (!stored) {
    saveIncidentsToStorage(mockIncidents);
    return mockIncidents;
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!isIncidentArray(parsed)) {
      saveIncidentsToStorage(mockIncidents);
      return mockIncidents;
    }

    return parsed.map(parseIncident);
  } catch {
    saveIncidentsToStorage(mockIncidents);
    return mockIncidents;
  }
}
