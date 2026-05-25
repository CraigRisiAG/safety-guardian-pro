import { getScopedAreaIds } from '@/lib/personnelAccess';
import { ComplianceCheck, CustomBuilding, UserPermission } from '@/types/admin';

const toUserIdCandidates = (permission: UserPermission): string[] => {
  const ids = [permission.id, permission.userId].filter((value): value is string => !!value);
  return Array.from(new Set(ids));
};

const intersects = (left: string[] | undefined, right: string[] | undefined): boolean => {
  if (!left || !right || left.length === 0 || right.length === 0) {
    return false;
  }

  const rightSet = new Set(right);
  return left.some((entry) => rightSet.has(entry));
};

const isAreaScopedMatch = (
  check: ComplianceCheck,
  permission: UserPermission,
  buildings: CustomBuilding[],
): boolean => {
  const scopedAreas = check.areaIds ?? [];
  if (scopedAreas.length === 0) {
    return true;
  }

  if (permission.primaryAreaId && scopedAreas.includes(permission.primaryAreaId)) {
    return true;
  }

  const permissionAreaIds = getScopedAreaIds(permission, buildings);
  return intersects(scopedAreas, permissionAreaIds);
};

const isFloorScopedMatch = (check: ComplianceCheck, permission: UserPermission): boolean => {
  const scopedFloors = check.floorIds ?? [];
  if (scopedFloors.length === 0) {
    return true;
  }

  if (!permission.primaryFloorId) {
    return false;
  }

  return scopedFloors.includes(permission.primaryFloorId);
};

const isBuildingScopedMatch = (check: ComplianceCheck, permission: UserPermission): boolean => {
  const scopedBuildings = check.buildingIds ?? [];
  if (scopedBuildings.length === 0) {
    return true;
  }

  return intersects(scopedBuildings, permission.buildingAccess);
};

export const isPermissionAssignedToCheck = (
  check: ComplianceCheck,
  permission: UserPermission,
  buildings: CustomBuilding[],
): boolean => {
  const candidateIds = toUserIdCandidates(permission);

  const explicitAssigned =
    candidateIds.some((id) => check.assignedUsers.includes(id)) ||
    (!!check.assignedTo && candidateIds.includes(check.assignedTo));

  const roleAssigned =
    (check.assignedSafetyRoles ?? []).length > 0 &&
    permission.safetyRoles.some((role) => (check.assignedSafetyRoles ?? []).includes(role));

  if (!explicitAssigned && !roleAssigned) {
    return false;
  }

  return (
    isBuildingScopedMatch(check, permission) &&
    isFloorScopedMatch(check, permission) &&
    isAreaScopedMatch(check, permission, buildings)
  );
};

export const resolveCheckAssignedUsers = (
  check: ComplianceCheck,
  users: UserPermission[],
  buildings: CustomBuilding[],
): UserPermission[] => {
  return users.filter((permission) => isPermissionAssignedToCheck(check, permission, buildings));
};
