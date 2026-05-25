import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  processOverdueComplianceChecks,
  loadMissedComplianceRecords,
  completeMissedComplianceForCheck,
} from '@/lib/complianceMonitoring';
import { AdminSettings, ComplianceCheck } from '@/types/admin';

const notifyComplianceChecksMissedMock = vi.fn(() => ({
  total: 1,
  sent: 1,
  queued: 0,
  skipped: 0,
}));

vi.mock('@/lib/notifications', () => ({
  notifyComplianceChecksMissed: (...args: unknown[]) => notifyComplianceChecksMissedMock(...args),
}));

const makeSettings = (check: ComplianceCheck): AdminSettings => ({
  buildings: [
    {
      id: 'b-1',
      name: 'HQ',
      floors: [
        {
          id: 'f-1',
          buildingId: 'b-1',
          name: 'Floor 1',
          level: 1,
          areas: [{ id: 'a-1', floorId: 'f-1', name: 'North' }],
        },
      ],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  ],
  userPermissions: [
    {
      id: 'u-1',
      userId: 'auth-1',
      userName: 'Safety Officer',
      email: 'u1@example.com',
      role: 'reporter',
      buildingAccess: ['b-1'],
      primaryFloorId: 'f-1',
      primaryAreaId: 'a-1',
      workDays: ['monday'],
      safetyRoles: ['fire_marshall'],
      canStartDrills: false,
      canResolveIncidents: true,
      canManageUsers: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  ],
  healthOfficialsRequiredDays: ['monday'],
  complianceChecks: [check],
  safetyCheckItems: [],
  complianceCategories: [],
  customIncidentFields: [],
  checkTypeFields: [],
  complianceScoring: undefined,
});

describe('processOverdueComplianceChecks', () => {
  beforeEach(() => {
    localStorage.clear();
    notifyComplianceChecksMissedMock.mockClear();
  });

  it('logs overdue recurring checks as incomplete and advances next due date', () => {
    const check: ComplianceCheck = {
      id: 'check-1',
      name: 'Monthly fire panel check',
      description: 'Verify panel',
      frequency: 'monthly',
      buildingIds: ['b-1'],
      floorIds: ['f-1'],
      areaIds: ['a-1'],
      nextDue: new Date('2026-02-01T09:00:00.000Z'),
      assignedUsers: ['u-1'],
      assignedSafetyRoles: [],
      status: 'pending',
      category: 'fire-safety',
      isRecurring: true,
    };

    const updates: Array<{ id: string; updates: Partial<ComplianceCheck> }> = [];
    const result = processOverdueComplianceChecks({
      settings: makeSettings(check),
      updateComplianceCheck: (id, payload) => updates.push({ id, updates: payload }),
    });

    expect(result.loggedCount).toBeGreaterThan(0);
    expect(result.notifiedCount).toBeGreaterThan(0);
    expect(notifyComplianceChecksMissedMock).toHaveBeenCalledTimes(1);

    const missed = loadMissedComplianceRecords();
    expect(missed.length).toBeGreaterThan(0);
    expect(missed[0].checkId).toBe('check-1');

    const dueUpdate = updates.find((entry) => entry.id === 'check-1');
    expect(dueUpdate).toBeDefined();
    expect(dueUpdate?.updates.nextDue).toBeInstanceOf(Date);
  });

  it('marks one-off overdue checks as overdue', () => {
    const check: ComplianceCheck = {
      id: 'check-2',
      name: 'One-off office audit',
      description: 'Verify office',
      frequency: 'monthly',
      buildingIds: ['b-1'],
      floorIds: ['f-1'],
      areaIds: ['a-1'],
      nextDue: new Date('2026-01-15T09:00:00.000Z'),
      assignedUsers: ['u-1'],
      assignedSafetyRoles: [],
      status: 'pending',
      category: 'office',
      isRecurring: false,
      recurrencePattern: 'none',
    };

    const updates: Array<{ id: string; updates: Partial<ComplianceCheck> }> = [];
    processOverdueComplianceChecks({
      settings: makeSettings(check),
      updateComplianceCheck: (id, payload) => updates.push({ id, updates: payload }),
    });

    const statusUpdate = updates.find((entry) => entry.id === 'check-2');
    expect(statusUpdate?.updates.status).toBe('overdue');
  });

  it('backfills historical recurring monthly misses beyond 24 cycles', () => {
    const check: ComplianceCheck = {
      id: 'check-legacy',
      name: 'Legacy monthly audit',
      description: 'Legacy recurring',
      frequency: 'monthly',
      buildingIds: ['b-1'],
      floorIds: ['f-1'],
      areaIds: ['a-1'],
      nextDue: new Date('2023-01-01T09:00:00.000Z'),
      assignedUsers: ['u-1'],
      assignedSafetyRoles: [],
      status: 'pending',
      category: 'office',
      isRecurring: true,
      recurrencePattern: 'monthly_same_date',
      startDate: new Date('2023-01-01T09:00:00.000Z'),
    };

    processOverdueComplianceChecks({
      settings: makeSettings(check),
      updateComplianceCheck: () => undefined,
    });

    const missed = loadMissedComplianceRecords().filter((entry) => entry.checkId === 'check-legacy');
    expect(missed.length).toBeGreaterThan(24);
  });

  it('marks a missed record as completed when resolved', () => {
    localStorage.setItem(
      'safeguard_missed_compliance_records',
      JSON.stringify([
        {
          id: 'missed-1',
          checkId: 'check-99',
          checkName: 'Monthly extinguisher check',
          dueAt: '2026-03-01T09:00:00.000Z',
          loggedAt: '2026-03-02T09:00:00.000Z',
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

    const changed = completeMissedComplianceForCheck('check-99');
    expect(changed).toBe(true);

    const records = loadMissedComplianceRecords();
    expect(records[0].status).toBe('completed');
    expect(records[0].resolvedAt).toBeInstanceOf(Date);
  });
});
