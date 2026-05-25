import { describe, expect, it } from 'vitest';
import { resolveCheckAssignedUsers } from '@/utils/complianceAssignments';
import { AdminSettings, ComplianceCheck, UserPermission } from '@/types/admin';

const users: UserPermission[] = [
  {
    id: 'u-1',
    userId: 'auth-1',
    userName: 'Area Fire Marshall',
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
  {
    id: 'u-2',
    userId: 'auth-2',
    userName: 'Other Area Fire Marshall',
    email: 'u2@example.com',
    role: 'reporter',
    buildingAccess: ['b-1'],
    primaryFloorId: 'f-1',
    primaryAreaId: 'a-2',
    workDays: ['monday'],
    safetyRoles: ['fire_marshall'],
    canStartDrills: false,
    canResolveIncidents: true,
    canManageUsers: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
];

const buildings: AdminSettings['buildings'] = [
  {
    id: 'b-1',
    name: 'HQ',
    floors: [
      {
        id: 'f-1',
        buildingId: 'b-1',
        name: 'Floor 1',
        level: 1,
        areas: [
          { id: 'a-1', floorId: 'f-1', name: 'North Wing' },
          { id: 'a-2', floorId: 'f-1', name: 'South Wing' },
        ],
      },
    ],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
];

const baseCheck: ComplianceCheck = {
  id: 'check-1',
  name: 'Fire route audit',
  description: 'Audit route',
  frequency: 'monthly',
  buildingIds: ['b-1'],
  floorIds: ['f-1'],
  areaIds: ['a-1'],
  nextDue: new Date('2026-05-01T09:00:00.000Z'),
  assignedUsers: [],
  assignedSafetyRoles: ['fire_marshall'],
  status: 'pending',
  category: 'fire-safety',
  isRecurring: true,
};

describe('resolveCheckAssignedUsers', () => {
  it('resolves role-based assignees within scoped areas', () => {
    const assigned = resolveCheckAssignedUsers(baseCheck, users, buildings);

    expect(assigned.map((entry) => entry.id)).toEqual(['u-1']);
  });

  it('includes explicit assignees even without matching role', () => {
    const check: ComplianceCheck = {
      ...baseCheck,
      assignedSafetyRoles: [],
      assignedUsers: ['u-2'],
      areaIds: [],
    };

    const assigned = resolveCheckAssignedUsers(check, users, buildings);
    expect(assigned.map((entry) => entry.id)).toEqual(['u-2']);
  });
});
