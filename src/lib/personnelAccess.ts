import { User } from '@/contexts/AuthContext';
import { UserPermission } from '@/types/admin';

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
  if (!user) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  return permission?.role === 'admin' || permission?.role === 'super_admin';
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

  if (isAdminPersonnelUser(user, currentPermission)) {
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
