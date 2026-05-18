import { User } from '@/contexts/AuthContext';
import { CustomBuilding, UserPermission, UserRole } from '@/types/admin';

const isSameEmail = (left?: string, right?: string) =>
  (left ?? '').trim().toLowerCase() === (right ?? '').trim().toLowerCase();

export const findCurrentUserPermission = (
  user: User | null,
  personnel: UserPermission[],
): UserPermission | null => {
  if (!user) {
    return null;
  }

  return (
    personnel.find(
      (entry) =>
        entry.userId === user.id ||
        entry.id === user.id ||
        isSameEmail(entry.email, user.email),
    ) ?? null
  );
};

export const isAdminPersonnelUser = (
  user: User | null,
  permission: UserPermission | null,
): boolean => {
  return !!user && permission?.role === 'super_admin';
};

export const getRolePermissionDefaults = (role: UserRole) => {
  switch (role) {
    case 'reporter':
      return {
        canStartDrills: false,
        canResolveIncidents: true,
        canManageUsers: false,
      };
    case 'responder':
      return {
        canStartDrills: true,
        canResolveIncidents: true,
        canManageUsers: false,
      };
    case 'admin':
    case 'super_admin':
      return {
        canStartDrills: true,
        canResolveIncidents: true,
        canManageUsers: true,
      };
    case 'viewer':
    default:
      return {
        canStartDrills: false,
        canResolveIncidents: false,
        canManageUsers: false,
      };
  }
};

export const isSuperAdminPermission = (permission: UserPermission | null) => permission?.role === 'super_admin';

export const canStartDrillsForUser = (permission: UserPermission | null) =>
  isSuperAdminPermission(permission) || !!permission?.canStartDrills;

export const canResolveIncidentsForUser = (permission: UserPermission | null) =>
  isSuperAdminPermission(permission) || !!permission?.canResolveIncidents;

export const canManageUsersForUser = (permission: UserPermission | null) =>
  isSuperAdminPermission(permission) || !!permission?.canManageUsers;

export const getScopedAreaIds = (
  permission: UserPermission | null,
  buildings: CustomBuilding[],
): string[] => {
  if (!permission) {
    return [];
  }

  if (permission.primaryAreaId) {
    return [permission.primaryAreaId];
  }

  if (permission.primaryFloorId) {
    const floor = buildings
      .flatMap((building) => building.floors)
      .find((entry) => entry.id === permission.primaryFloorId);
    return floor?.areas.map((area) => area.id) ?? [];
  }

  if (permission.buildingAccess.length > 0) {
    return buildings
      .filter((building) => permission.buildingAccess.includes(building.id))
      .flatMap((building) => building.floors.flatMap((floor) => floor.areas.map((area) => area.id)));
  }

  return [];
};

const canViewerSeePerson = (viewer: UserPermission, target: UserPermission) => {
  if (viewer.userId === target.userId || isSameEmail(viewer.email, target.email)) {
    return true;
  }

  if (viewer.primaryFloorId && viewer.primaryAreaId) {
    return target.primaryFloorId === viewer.primaryFloorId && target.primaryAreaId === viewer.primaryAreaId;
  }

  if (viewer.primaryFloorId) {
    return target.primaryFloorId === viewer.primaryFloorId;
  }

  if (viewer.primaryAreaId) {
    return target.primaryAreaId === viewer.primaryAreaId;
  }

  return false;
};

const canNonAdminSeePerson = (viewer: UserPermission, target: UserPermission) => {
  if (viewer.userId === target.userId || isSameEmail(viewer.email, target.email)) {
    return true;
  }

  if (!viewer.primaryAreaId) {
    return false;
  }

  return target.primaryAreaId === viewer.primaryAreaId;
};

export const filterPersonnelByUserScope = (
  personnel: UserPermission[],
  user: User | null,
): UserPermission[] => {
  const currentPermission = findCurrentUserPermission(user, personnel);

  if (isSuperAdminPermission(currentPermission)) {
    return personnel;
  }

  if (!currentPermission) {
    return [];
  }

  if (currentPermission.role === 'viewer') {
    return personnel.filter((target) => canViewerSeePerson(currentPermission, target));
  }

  return personnel.filter((target) => canNonAdminSeePerson(currentPermission, target));
};
