import { describe, expect, it } from 'vitest';
import {
  findCurrentUserPermission,
  getRolePermissionDefaults,
  getScopedAreaIds,
  filterPersonnelByUserScope,
  canStartDrillsForUser,
  canResolveIncidentsForUser,
  canManageUsersForUser,
} from '@/lib/personnelAccess';
import type { CustomBuilding, UserPermission } from '@/types/admin';
import type { User } from '@/contexts/AuthContext';

const now = new Date('2026-01-01T00:00:00.000Z');

const buildings: CustomBuilding[] = [
  {
    id: 'b-1',
    name: 'Main',
    createdAt: now,
    updatedAt: now,
    floors: [
      {
        id: 'f-1',
        buildingId: 'b-1',
        name: 'Ground',
        level: 0,
        areas: [
          { id: 'a-1', floorId: 'f-1', name: 'Reception' },
          { id: 'a-2', floorId: 'f-1', name: 'Office' },
        ],
      },
      {
        id: 'f-2',
        buildingId: 'b-1',
        name: 'First',
        level: 1,
        areas: [{ id: 'a-3', floorId: 'f-2', name: 'Lab' }],
      },
    ],
  },
];

const createPermission = (overrides: Partial<UserPermission>): UserPermission => ({
  id: overrides.id ?? 'perm-1',
  userId: overrides.userId ?? 'user-1',
  userName: overrides.userName ?? 'User One',
  email: overrides.email ?? 'user.one@example.com',
  role: overrides.role ?? 'viewer',
  buildingAccess: overrides.buildingAccess ?? ['b-1'],
  primaryFloorId: overrides.primaryFloorId,
  primaryAreaId: overrides.primaryAreaId,
  workDays: overrides.workDays ?? ['monday'],
  safetyRoles: overrides.safetyRoles ?? [],
  canStartDrills: overrides.canStartDrills ?? false,
  canResolveIncidents: overrides.canResolveIncidents ?? false,
  canManageUsers: overrides.canManageUsers ?? false,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

describe('personnelAccess', () => {
  it('finds current permission by id, userId, or case-insensitive email', () => {
    const user: User = {
      id: 'u-100',
      email: 'Case.Email@Example.com',
      name: 'Case User',
      role: 'user',
    };

    const personnel = [
      createPermission({ id: 'perm-a', userId: 'u-abc', email: 'other@example.com' }),
      createPermission({ id: 'perm-b', userId: 'u-100', email: 'case.email@example.com' }),
    ];

    const permission = findCurrentUserPermission(user, personnel);

    expect(permission?.id).toBe('perm-b');
  });

  it('returns role defaults correctly', () => {
    expect(getRolePermissionDefaults('viewer')).toEqual({
      canStartDrills: false,
      canResolveIncidents: false,
      canManageUsers: false,
    });

    expect(getRolePermissionDefaults('admin')).toEqual({
      canStartDrills: true,
      canResolveIncidents: true,
      canManageUsers: true,
    });
  });

  it('calculates scoped area ids by primary area, floor, and building access', () => {
    const byArea = createPermission({ primaryAreaId: 'a-2', buildingAccess: [] });
    expect(getScopedAreaIds(byArea, buildings)).toEqual(['a-2']);

    const byFloor = createPermission({ primaryAreaId: undefined, primaryFloorId: 'f-1', buildingAccess: [] });
    expect(getScopedAreaIds(byFloor, buildings)).toEqual(['a-1', 'a-2']);

    const byBuilding = createPermission({ primaryAreaId: undefined, primaryFloorId: undefined, buildingAccess: ['b-1'] });
    expect(getScopedAreaIds(byBuilding, buildings)).toEqual(['a-1', 'a-2', 'a-3']);
  });

  it('applies permission helpers with super admin override', () => {
    const normal = createPermission({ role: 'reporter', canResolveIncidents: true, canManageUsers: false });
    expect(canStartDrillsForUser(normal)).toBe(false);
    expect(canResolveIncidentsForUser(normal)).toBe(true);
    expect(canManageUsersForUser(normal)).toBe(false);

    const superAdmin = createPermission({ role: 'super_admin', canStartDrills: false, canResolveIncidents: false, canManageUsers: false });
    expect(canStartDrillsForUser(superAdmin)).toBe(true);
    expect(canResolveIncidentsForUser(superAdmin)).toBe(true);
    expect(canManageUsersForUser(superAdmin)).toBe(true);
  });

  it('filters personnel by viewer and non-admin scopes', () => {
    const viewerUser: User = { id: 'user-viewer', email: 'viewer@example.com', name: 'Viewer', role: 'user' };
    const responderUser: User = { id: 'user-responder', email: 'responder@example.com', name: 'Responder', role: 'user' };

    const viewerPermission = createPermission({
      id: 'perm-viewer',
      userId: 'user-viewer',
      email: 'viewer@example.com',
      role: 'viewer',
      primaryFloorId: 'f-1',
      primaryAreaId: 'a-1',
    });

    const responderPermission = createPermission({
      id: 'perm-responder',
      userId: 'user-responder',
      email: 'responder@example.com',
      role: 'responder',
      primaryAreaId: 'a-1',
    });

    const sameArea = createPermission({ id: 'perm-same-area', userId: 'u-2', email: 'same.area@example.com', primaryAreaId: 'a-1', primaryFloorId: 'f-1' });
    const otherAreaSameFloor = createPermission({ id: 'perm-other-area', userId: 'u-3', email: 'other.area@example.com', primaryAreaId: 'a-2', primaryFloorId: 'f-1' });
    const otherFloor = createPermission({ id: 'perm-other-floor', userId: 'u-4', email: 'other.floor@example.com', primaryAreaId: 'a-3', primaryFloorId: 'f-2' });

    const personnel = [viewerPermission, responderPermission, sameArea, otherAreaSameFloor, otherFloor];

    const viewerScoped = filterPersonnelByUserScope(personnel, viewerUser);
    expect(viewerScoped.map((entry) => entry.id)).toEqual(['perm-viewer', 'perm-same-area']);

    const responderScoped = filterPersonnelByUserScope(personnel, responderUser);
    expect(responderScoped.map((entry) => entry.id)).toEqual(['perm-viewer', 'perm-responder', 'perm-same-area']);
  });
});
