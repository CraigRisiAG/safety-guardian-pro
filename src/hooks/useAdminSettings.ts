import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AdminSettings,
  ALL_WORK_DAYS,
  CustomBuilding,
  ComplianceScoringSettings,
  DEFAULT_COMPLIANCE_SCORING_SETTINGS,
  UserPermission,
  WorkDay,
  ComplianceCheck,
  SafetyCheckItem,
  ComplianceCategory,
  CustomIncidentField,
  DEFAULT_COMPLIANCE_CATEGORIES,
  DEFAULT_SAFETY_CHECK_ITEMS,
} from '@/types/admin';
import { CheckTypeField } from '@/types/compliance';
import { buildings } from '@/data/mockData';
import { getRolePermissionDefaults } from '@/lib/personnelAccess';
import { logAuditEvent } from '@/lib/auditLog';

const STORAGE_KEY = 'safeguard_admin_settings';
const SETTINGS_UPDATED_EVENT = 'safeguard_admin_settings_updated';
const AUTH_ACCOUNTS_STORAGE_KEY = 'auth_accounts';

interface AuthAccountRecord {
  id: string;
  email: string;
  name: string;
  role?: 'user' | 'admin';
}

const VALID_WORK_DAYS = new Set<WorkDay>([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

const normalizeWorkDays = (value: unknown): WorkDay[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((day): day is WorkDay => typeof day === 'string' && VALID_WORK_DAYS.has(day as WorkDay));
};

const normalizeRequiredCoverageDays = (value: unknown): WorkDay[] => {
  const normalized = normalizeWorkDays(value);
  if (normalized.length === 0) {
    return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  }

  return ALL_WORK_DAYS.filter((day) => normalized.includes(day));
};

const parseAuthAccounts = (raw: string | null): AuthAccountRecord[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as AuthAccountRecord[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry) => !!entry?.id && !!entry?.email && !!entry?.name);
  } catch {
    return [];
  }
};

const parseStoredSettings = (stored: string | null): AdminSettings | null => {
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as {
      checkTypeFields?: unknown;
      healthOfficialsRequiredDays?: unknown;
      complianceScoring?: Partial<ComplianceScoringSettings> & {
        weights?: Partial<ComplianceScoringSettings['weights']>;
      };
      buildings: Array<Record<string, unknown>>;
      userPermissions: Array<Record<string, unknown>>;
      complianceChecks: Array<Record<string, unknown>>;
    };
    const parsedScoring = parsed.complianceScoring;
    const complianceScoring: ComplianceScoringSettings = {
      ...DEFAULT_COMPLIANCE_SCORING_SETTINGS,
      ...parsedScoring,
      weights: {
        ...DEFAULT_COMPLIANCE_SCORING_SETTINGS.weights,
        ...(parsedScoring?.weights ?? {}),
      },
      areaReportPeriod:
        parsedScoring?.areaReportPeriod === 'quarterly'
          ? 'quarterly'
          : 'monthly',
    };

    return {
      ...parsed,
      checkTypeFields: Array.isArray(parsed.checkTypeFields) ? parsed.checkTypeFields : [],
      complianceScoring,
      healthOfficialsRequiredDays: normalizeRequiredCoverageDays(parsed.healthOfficialsRequiredDays),
      buildings: parsed.buildings.map((b) => ({
        ...b,
        createdAt: new Date(b.createdAt as string | number | Date),
        updatedAt: new Date(b.updatedAt as string | number | Date),
      })),
      userPermissions: parsed.userPermissions.map((p) => ({
        ...p,
        workDays: normalizeWorkDays(p.workDays),
        createdAt: new Date(p.createdAt as string | number | Date),
        updatedAt: new Date(p.updatedAt as string | number | Date),
      })),
      complianceChecks: parsed.complianceChecks.map((c) => ({
        ...c,
        lastCompleted: c.lastCompleted ? new Date(c.lastCompleted as string | number | Date) : undefined,
        nextDue: new Date(c.nextDue as string | number | Date),
        startDate: c.startDate ? new Date(c.startDate as string | number | Date) : undefined,
        endDate: c.endDate ? new Date(c.endDate as string | number | Date) : undefined,
        floorIds: Array.isArray(c.floorIds) ? c.floorIds : [],
        areaIds: Array.isArray(c.areaIds) ? c.areaIds : [],
        recurrencePattern: c.recurrencePattern || (c.isRecurring ? 'monthly_same_date' : 'none'),
      })),
    };
  } catch {
    return null;
  }
};

const buildUniqueId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};

const getDefaultSettings = (): AdminSettings => ({
  buildings: buildings.map((b) => ({
    id: b.id,
    name: b.name,
    floors: b.floors.map((f) => ({
      id: f.id,
      buildingId: b.id,
      name: f.name,
      level: parseInt(f.name.match(/\d+/)?.[0] || '0'),
      areas: f.areas.map((a) => ({
        id: a.id,
        floorId: f.id,
        name: a.name,
      })),
    })),
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  userPermissions: [
    {
      id: 'user-1',
      userId: 'admin-1',
      userName: 'Safety Officer',
      email: 'safety@example.com',
      role: 'super_admin',
      buildingAccess: ['building-1', 'building-2'],
      workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      safetyRoles: ['health_safety_officer'],
      canStartDrills: true,
      canResolveIncidents: true,
      canManageUsers: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  healthOfficialsRequiredDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  complianceChecks: [],
  safetyCheckItems: DEFAULT_SAFETY_CHECK_ITEMS,
  complianceCategories: DEFAULT_COMPLIANCE_CATEGORIES,
  customIncidentFields: [
    { id: 'witnesses', name: 'witnesses', label: 'Witnesses', type: 'textarea', required: false, placeholder: 'List any witnesses...', order: 1, enabled: true },
    { id: 'immediate-action', name: 'immediate_action', label: 'Immediate Action Taken', type: 'textarea', required: false, placeholder: 'Describe any immediate actions...', order: 2, enabled: true },
    { id: 'injury-reported', name: 'injury_reported', label: 'Injury Reported', type: 'checkbox', required: false, order: 3, enabled: true },
  ],
  checkTypeFields: [],
  complianceScoring: DEFAULT_COMPLIANCE_SCORING_SETTINGS,
});

export function useAdminSettings() {
  const [settings, setSettings] = useState<AdminSettings>(() => {
    const parsed = parseStoredSettings(localStorage.getItem(STORAGE_KEY));
    return parsed ?? getDefaultSettings();
  });
  const settingsRef = useRef(settings);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const logSettingsAction = useCallback(
    (event: {
      action: string;
      description: string;
      location?: {
        buildingId?: string;
        floorId?: string;
        areaId?: string;
        areaIds?: string[];
      };
      metadata?: Record<string, string | number | boolean | null>;
    }) => {
      logAuditEvent({
        module: 'admin_settings',
        action: event.action,
        description: event.description,
        location: event.location,
        metadata: event.metadata,
      });
    },
    [],
  );

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT));
  }, [settings]);

  // Ensure any auth account exists in user permissions (default viewer unless account is admin)
  useEffect(() => {
    const authAccounts = parseAuthAccounts(localStorage.getItem(AUTH_ACCOUNTS_STORAGE_KEY));
    if (authAccounts.length === 0) {
      return;
    }

    const normalizedPermissions = settings.userPermissions.map((permission) => ({
      id: permission.id,
      userId: permission.userId,
      email: permission.email.trim().toLowerCase(),
    }));

    const missingAccounts = authAccounts.filter((account) => {
      const email = account.email.trim().toLowerCase();
      return !normalizedPermissions.some(
        (permission) => permission.userId === account.id || permission.id === account.id || permission.email === email,
      );
    });

    if (missingAccounts.length === 0) {
      return;
    }

    const now = new Date();
    const additions: UserPermission[] = missingAccounts.map((account, index) => {
      const mappedRole = account.role === 'admin' ? 'admin' : 'viewer';
      const defaults = getRolePermissionDefaults(mappedRole);
      return {
        id: `perm-auth-${Date.now()}-${index}`,
        userId: account.id,
        userName: account.name,
        email: account.email.trim().toLowerCase(),
        role: mappedRole,
        buildingAccess: [],
        primaryFloorId: undefined,
        primaryAreaId: undefined,
        workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        safetyRoles: [],
        canStartDrills: defaults.canStartDrills,
        canResolveIncidents: defaults.canResolveIncidents,
        canManageUsers: defaults.canManageUsers,
        createdAt: now,
        updatedAt: now,
      };
    });

    setSettings((prev) => ({
      ...prev,
      userPermissions: [...prev.userPermissions, ...additions],
    }));
  }, [settings.userPermissions]);

  // Keep multiple hook instances in sync (same-tab + cross-tab)
  useEffect(() => {
    const syncFromStorage = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = parseStoredSettings(stored);
      if (!parsed) {
        return;
      }

      const current = JSON.stringify(settings);
      if (stored !== current) {
        setSettings(parsed);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        syncFromStorage();
      }
    };

    const handleLocalUpdate = () => {
      syncFromStorage();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(SETTINGS_UPDATED_EVENT, handleLocalUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(SETTINGS_UPDATED_EVENT, handleLocalUpdate);
    };
  }, [settings]);

  // Building operations
  const addBuilding = useCallback((building: Omit<CustomBuilding, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newBuilding: CustomBuilding = {
      ...building,
      id: buildUniqueId('building'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setSettings((prev) => ({
      ...prev,
      buildings: [...prev.buildings, newBuilding],
    }));

    logSettingsAction({
      action: 'add_building',
      description: `Added building "${newBuilding.name}"`,
      location: { buildingId: newBuilding.id },
    });

    return newBuilding;
  }, [logSettingsAction]);

  const updateBuilding = useCallback((id: string, updates: Partial<CustomBuilding>) => {
    const existing = settingsRef.current.buildings.find((entry) => entry.id === id);

    setSettings((prev) => ({
      ...prev,
      buildings: prev.buildings.map((b) =>
        b.id === id ? { ...b, ...updates, updatedAt: new Date() } : b
      ),
    }));

    if (existing) {
      logSettingsAction({
        action: 'update_building',
        description: `Updated building "${existing.name}"`,
        location: { buildingId: existing.id },
      });
    }
  }, [logSettingsAction]);

  const deleteBuilding = useCallback((id: string) => {
    const existing = settingsRef.current.buildings.find((entry) => entry.id === id);

    setSettings((prev) => ({
      ...prev,
      buildings: prev.buildings.filter((b) => b.id !== id),
    }));

    if (existing) {
      logSettingsAction({
        action: 'delete_building',
        description: `Deleted building "${existing.name}"`,
        location: { buildingId: existing.id },
      });
    }
  }, [logSettingsAction]);

  // User permission operations
  const addUserPermission = useCallback((permission: Omit<UserPermission, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newPermission: UserPermission = {
      ...permission,
      id: `perm-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setSettings((prev) => ({
      ...prev,
      userPermissions: [...prev.userPermissions, newPermission],
    }));

    logSettingsAction({
      action: 'add_user_permission',
      description: `Added user permission for ${newPermission.userName}`,
      location: {
        buildingId: newPermission.buildingAccess[0],
        floorId: newPermission.primaryFloorId,
        areaId: newPermission.primaryAreaId,
      },
    });

    return newPermission;
  }, [logSettingsAction]);

  const bulkAddUserPermissions = useCallback((permissions: Omit<UserPermission, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const newPermissions: UserPermission[] = permissions.map((permission, index) => ({
      ...permission,
      id: `perm-${Date.now()}-${index}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    setSettings((prev) => ({
      ...prev,
      userPermissions: [...prev.userPermissions, ...newPermissions],
    }));

    logSettingsAction({
      action: 'bulk_add_user_permissions',
      description: `Bulk added ${newPermissions.length} user permission entries`,
      metadata: { count: newPermissions.length },
    });

    return newPermissions;
  }, [logSettingsAction]);

  const updateUserPermission = useCallback((id: string, updates: Partial<UserPermission>) => {
    const existing = settingsRef.current.userPermissions.find((entry) => entry.id === id);

    setSettings((prev) => ({
      ...prev,
      userPermissions: prev.userPermissions.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
      ),
    }));

    if (existing) {
      logSettingsAction({
        action: 'update_user_permission',
        description: `Updated user permission for ${existing.userName}`,
        location: {
          buildingId: updates.buildingAccess?.[0] ?? existing.buildingAccess[0],
          floorId: updates.primaryFloorId ?? existing.primaryFloorId,
          areaId: updates.primaryAreaId ?? existing.primaryAreaId,
        },
      });
    }
  }, [logSettingsAction]);

  const upsertUserPermissionByIdentity = useCallback((permission: Omit<UserPermission, 'id' | 'createdAt' | 'updatedAt'>) => {
    const normalizedEmail = permission.email.trim().toLowerCase();
    const now = new Date();
    const stored = parseStoredSettings(localStorage.getItem(STORAGE_KEY));
    const baseSettings = stored ?? settings;

    const existing = baseSettings.userPermissions.find(
      (entry) =>
        entry.userId === permission.userId ||
        entry.email.trim().toLowerCase() === normalizedEmail,
    );

    const nextPermission: UserPermission = existing
      ? {
          ...existing,
          ...permission,
          email: normalizedEmail,
          workDays: normalizeWorkDays(permission.workDays),
          updatedAt: now,
        }
      : {
          ...permission,
          email: normalizedEmail,
          workDays: normalizeWorkDays(permission.workDays),
          id: `perm-${Date.now()}`,
          createdAt: now,
          updatedAt: now,
        };

    const nextSettings: AdminSettings = {
      ...baseSettings,
      userPermissions: existing
        ? baseSettings.userPermissions.map((entry) => (entry.id === existing.id ? nextPermission : entry))
        : [...baseSettings.userPermissions, nextPermission],
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
    window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT));
    setSettings(nextSettings);

    logSettingsAction({
      action: existing ? 'update_user_permission_identity' : 'add_user_permission_identity',
      description: `${existing ? 'Updated' : 'Added'} permission via identity for ${permission.userName}`,
      location: {
        buildingId: permission.buildingAccess[0],
        floorId: permission.primaryFloorId,
        areaId: permission.primaryAreaId,
      },
    });

    return nextPermission;
  }, [settings, logSettingsAction]);

  const deleteUserPermission = useCallback((id: string) => {
    const existing = settingsRef.current.userPermissions.find((entry) => entry.id === id);

    setSettings((prev) => ({
      ...prev,
      userPermissions: prev.userPermissions.filter((p) => p.id !== id),
    }));

    if (existing) {
      logSettingsAction({
        action: 'delete_user_permission',
        description: `Deleted user permission for ${existing.userName}`,
        location: {
          buildingId: existing.buildingAccess[0],
          floorId: existing.primaryFloorId,
          areaId: existing.primaryAreaId,
        },
      });
    }
  }, [logSettingsAction]);

  const updateHealthOfficialsRequiredDays = useCallback((days: WorkDay[]) => {
    const normalized = normalizeRequiredCoverageDays(days);
    setSettings((prev) => ({
      ...prev,
      healthOfficialsRequiredDays: normalized,
    }));

    logSettingsAction({
      action: 'update_coverage_days',
      description: 'Updated required coverage days for Health & Safety officials',
      metadata: { selectedDays: normalized.join(', ') },
    });
  }, [logSettingsAction]);

  const updateComplianceScoring = useCallback((updates: Partial<ComplianceScoringSettings>) => {
    setSettings((prev) => ({
      ...prev,
      complianceScoring: {
        ...DEFAULT_COMPLIANCE_SCORING_SETTINGS,
        ...(prev.complianceScoring ?? {}),
        ...updates,
        weights: {
          ...DEFAULT_COMPLIANCE_SCORING_SETTINGS.weights,
          ...(prev.complianceScoring?.weights ?? {}),
          ...(updates.weights ?? {}),
        },
      },
    }));

    logSettingsAction({
      action: 'update_compliance_scoring',
      description: 'Updated compliance scoring settings',
    });
  }, [logSettingsAction]);

  // Compliance check operations
  const addComplianceCheck = useCallback((check: Omit<ComplianceCheck, 'id'>) => {
    const newCheck: ComplianceCheck = {
      ...check,
      id: `check-${Date.now()}`,
    };
    setSettings((prev) => ({
      ...prev,
      complianceChecks: [...prev.complianceChecks, newCheck],
    }));

    logSettingsAction({
      action: 'add_compliance_check',
      description: `Added compliance check "${newCheck.name}"`,
      location: {
        buildingId: newCheck.buildingIds[0],
        floorId: newCheck.floorIds?.[0],
        areaId: newCheck.areaIds?.[0],
        areaIds: newCheck.areaIds,
      },
    });

    return newCheck;
  }, [logSettingsAction]);

  const updateComplianceCheck = useCallback((id: string, updates: Partial<ComplianceCheck>) => {
    const existing = settingsRef.current.complianceChecks.find((entry) => entry.id === id);

    setSettings((prev) => ({
      ...prev,
      complianceChecks: prev.complianceChecks.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));

    if (existing) {
      logSettingsAction({
        action: 'update_compliance_check',
        description: `Updated compliance check "${existing.name}"`,
        location: {
          buildingId: updates.buildingIds?.[0] ?? existing.buildingIds[0],
          floorId: updates.floorIds?.[0] ?? existing.floorIds?.[0],
          areaId: updates.areaIds?.[0] ?? existing.areaIds?.[0],
          areaIds: updates.areaIds ?? existing.areaIds,
        },
      });
    }
  }, [logSettingsAction]);

  const deleteComplianceCheck = useCallback((id: string) => {
    const existing = settingsRef.current.complianceChecks.find((entry) => entry.id === id);

    setSettings((prev) => ({
      ...prev,
      complianceChecks: prev.complianceChecks.filter((c) => c.id !== id),
    }));

    if (existing) {
      logSettingsAction({
        action: 'delete_compliance_check',
        description: `Deleted compliance check "${existing.name}"`,
        location: {
          buildingId: existing.buildingIds[0],
          floorId: existing.floorIds?.[0],
          areaId: existing.areaIds?.[0],
          areaIds: existing.areaIds,
        },
      });
    }
  }, [logSettingsAction]);

  // Safety check item operations
  const addSafetyCheckItem = useCallback((item: Omit<SafetyCheckItem, 'id'>) => {
    const newItem: SafetyCheckItem = {
      ...item,
      id: `item-${Date.now()}`,
    };
    setSettings((prev) => ({
      ...prev,
      safetyCheckItems: [...prev.safetyCheckItems, newItem],
    }));

    logSettingsAction({
      action: 'add_safety_check_item',
      description: `Added safety check item "${newItem.name}"`,
    });

    return newItem;
  }, [logSettingsAction]);

  const updateSafetyCheckItem = useCallback((id: string, updates: Partial<SafetyCheckItem>) => {
    const existing = settingsRef.current.safetyCheckItems.find((entry) => entry.id === id);

    setSettings((prev) => ({
      ...prev,
      safetyCheckItems: prev.safetyCheckItems.map((i) =>
        i.id === id ? { ...i, ...updates } : i
      ),
    }));

    if (existing) {
      logSettingsAction({
        action: 'update_safety_check_item',
        description: `Updated safety check item "${existing.name}"`,
      });
    }
  }, [logSettingsAction]);

  const deleteSafetyCheckItem = useCallback((id: string) => {
    const existing = settingsRef.current.safetyCheckItems.find((entry) => entry.id === id);

    setSettings((prev) => ({
      ...prev,
      safetyCheckItems: prev.safetyCheckItems.filter((i) => i.id !== id),
    }));

    if (existing) {
      logSettingsAction({
        action: 'delete_safety_check_item',
        description: `Deleted safety check item "${existing.name}"`,
      });
    }
  }, [logSettingsAction]);

  // Custom incident field operations
  const addCustomIncidentField = useCallback((field: Omit<CustomIncidentField, 'id'>) => {
    const newField: CustomIncidentField = {
      ...field,
      id: `field-${Date.now()}`,
    };
    setSettings((prev) => ({
      ...prev,
      customIncidentFields: [...prev.customIncidentFields, newField],
    }));

    logSettingsAction({
      action: 'add_incident_field',
      description: `Added custom incident field "${newField.label}"`,
    });

    return newField;
  }, [logSettingsAction]);

  const updateCustomIncidentField = useCallback((id: string, updates: Partial<CustomIncidentField>) => {
    const existing = settingsRef.current.customIncidentFields.find((entry) => entry.id === id);

    setSettings((prev) => ({
      ...prev,
      customIncidentFields: prev.customIncidentFields.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
    }));

    if (existing) {
      logSettingsAction({
        action: 'update_incident_field',
        description: `Updated custom incident field "${existing.label}"`,
      });
    }
  }, [logSettingsAction]);

  const deleteCustomIncidentField = useCallback((id: string) => {
    const existing = settingsRef.current.customIncidentFields.find((entry) => entry.id === id);

    setSettings((prev) => ({
      ...prev,
      customIncidentFields: prev.customIncidentFields.filter((f) => f.id !== id),
    }));

    if (existing) {
      logSettingsAction({
        action: 'delete_incident_field',
        description: `Deleted custom incident field "${existing.label}"`,
      });
    }
  }, [logSettingsAction]);

  // Check type field operations
  const addCheckTypeField = useCallback((field: Omit<CheckTypeField, 'id'>) => {
    const newField: CheckTypeField = { ...field, id: buildUniqueId('ctfield') };
    setSettings((prev) => ({
      ...prev,
      checkTypeFields: [...(prev.checkTypeFields || []), newField],
    }));

    logSettingsAction({
      action: 'add_check_type_field',
      description: `Added check type field "${newField.label}"`,
    });

    return newField;
  }, [logSettingsAction]);

  const updateCheckTypeField = useCallback((id: string, updates: Partial<CheckTypeField>) => {
    const existing = (settingsRef.current.checkTypeFields || []).find((entry) => entry.id === id);

    setSettings((prev) => ({
      ...prev,
      checkTypeFields: (prev.checkTypeFields || []).map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));

    if (existing) {
      logSettingsAction({
        action: 'update_check_type_field',
        description: `Updated check type field "${existing.label}"`,
      });
    }
  }, [logSettingsAction]);

  const deleteCheckTypeField = useCallback((id: string) => {
    const existing = (settingsRef.current.checkTypeFields || []).find((entry) => entry.id === id);

    setSettings((prev) => ({
      ...prev,
      checkTypeFields: (prev.checkTypeFields || []).filter((f) => f.id !== id),
    }));

    if (existing) {
      logSettingsAction({
        action: 'delete_check_type_field',
        description: `Deleted check type field "${existing.label}"`,
      });
    }
  }, [logSettingsAction]);

  const resetToDefaults = useCallback(() => {
    setSettings(getDefaultSettings());

    logSettingsAction({
      action: 'reset_admin_settings',
      description: 'Reset all admin settings to defaults',
    });
  }, [logSettingsAction]);

  return {
    settings,
    isLoading,
    // Buildings
    addBuilding,
    updateBuilding,
    deleteBuilding,
    // User permissions
    addUserPermission,
    bulkAddUserPermissions,
    updateUserPermission,
    upsertUserPermissionByIdentity,
    deleteUserPermission,
    updateHealthOfficialsRequiredDays,
    updateComplianceScoring,
    // Compliance checks
    addComplianceCheck,
    updateComplianceCheck,
    deleteComplianceCheck,
    // Safety check items
    addSafetyCheckItem,
    updateSafetyCheckItem,
    deleteSafetyCheckItem,
    // Custom incident fields
    addCustomIncidentField,
    updateCustomIncidentField,
    deleteCustomIncidentField,
    // Check type custom fields
    addCheckTypeField,
    updateCheckTypeField,
    deleteCheckTypeField,
    // Reset
    resetToDefaults,
  };
}
