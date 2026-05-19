import { useState, useEffect, useCallback } from 'react';
import {
  AdminSettings,
  CustomBuilding,
  UserPermission,
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

const STORAGE_KEY = 'safeguard_admin_settings';
const SETTINGS_UPDATED_EVENT = 'safeguard_admin_settings_updated';
const AUTH_ACCOUNTS_STORAGE_KEY = 'auth_accounts';

interface AuthAccountRecord {
  id: string;
  email: string;
  name: string;
  role?: 'user' | 'admin';
}

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
    const parsed = JSON.parse(stored);
    return {
      ...parsed,
      checkTypeFields: Array.isArray(parsed.checkTypeFields) ? parsed.checkTypeFields : [],
      buildings: parsed.buildings.map((b: any) => ({
        ...b,
        createdAt: new Date(b.createdAt),
        updatedAt: new Date(b.updatedAt),
      })),
      userPermissions: parsed.userPermissions.map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      })),
      complianceChecks: parsed.complianceChecks.map((c: any) => ({
        ...c,
        lastCompleted: c.lastCompleted ? new Date(c.lastCompleted) : undefined,
        nextDue: new Date(c.nextDue),
        startDate: c.startDate ? new Date(c.startDate) : undefined,
        endDate: c.endDate ? new Date(c.endDate) : undefined,
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
  complianceChecks: [],
  safetyCheckItems: DEFAULT_SAFETY_CHECK_ITEMS,
  complianceCategories: DEFAULT_COMPLIANCE_CATEGORIES,
  customIncidentFields: [
    { id: 'witnesses', name: 'witnesses', label: 'Witnesses', type: 'textarea', required: false, placeholder: 'List any witnesses...', order: 1, enabled: true },
    { id: 'immediate-action', name: 'immediate_action', label: 'Immediate Action Taken', type: 'textarea', required: false, placeholder: 'Describe any immediate actions...', order: 2, enabled: true },
    { id: 'injury-reported', name: 'injury_reported', label: 'Injury Reported', type: 'checkbox', required: false, order: 3, enabled: true },
  ],
  checkTypeFields: [],
});

export function useAdminSettings() {
  const [settings, setSettings] = useState<AdminSettings>(() => {
    const parsed = parseStoredSettings(localStorage.getItem(STORAGE_KEY));
    return parsed ?? getDefaultSettings();
  });

  const [isLoading, setIsLoading] = useState(false);

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
    return newBuilding;
  }, []);

  const updateBuilding = useCallback((id: string, updates: Partial<CustomBuilding>) => {
    setSettings((prev) => ({
      ...prev,
      buildings: prev.buildings.map((b) =>
        b.id === id ? { ...b, ...updates, updatedAt: new Date() } : b
      ),
    }));
  }, []);

  const deleteBuilding = useCallback((id: string) => {
    setSettings((prev) => ({
      ...prev,
      buildings: prev.buildings.filter((b) => b.id !== id),
    }));
  }, []);

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
    return newPermission;
  }, []);

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
    return newPermissions;
  }, []);

  const updateUserPermission = useCallback((id: string, updates: Partial<UserPermission>) => {
    setSettings((prev) => ({
      ...prev,
      userPermissions: prev.userPermissions.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
      ),
    }));
  }, []);

  const deleteUserPermission = useCallback((id: string) => {
    setSettings((prev) => ({
      ...prev,
      userPermissions: prev.userPermissions.filter((p) => p.id !== id),
    }));
  }, []);

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
    return newCheck;
  }, []);

  const updateComplianceCheck = useCallback((id: string, updates: Partial<ComplianceCheck>) => {
    setSettings((prev) => ({
      ...prev,
      complianceChecks: prev.complianceChecks.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  }, []);

  const deleteComplianceCheck = useCallback((id: string) => {
    setSettings((prev) => ({
      ...prev,
      complianceChecks: prev.complianceChecks.filter((c) => c.id !== id),
    }));
  }, []);

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
    return newItem;
  }, []);

  const updateSafetyCheckItem = useCallback((id: string, updates: Partial<SafetyCheckItem>) => {
    setSettings((prev) => ({
      ...prev,
      safetyCheckItems: prev.safetyCheckItems.map((i) =>
        i.id === id ? { ...i, ...updates } : i
      ),
    }));
  }, []);

  const deleteSafetyCheckItem = useCallback((id: string) => {
    setSettings((prev) => ({
      ...prev,
      safetyCheckItems: prev.safetyCheckItems.filter((i) => i.id !== id),
    }));
  }, []);

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
    return newField;
  }, []);

  const updateCustomIncidentField = useCallback((id: string, updates: Partial<CustomIncidentField>) => {
    setSettings((prev) => ({
      ...prev,
      customIncidentFields: prev.customIncidentFields.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
    }));
  }, []);

  const deleteCustomIncidentField = useCallback((id: string) => {
    setSettings((prev) => ({
      ...prev,
      customIncidentFields: prev.customIncidentFields.filter((f) => f.id !== id),
    }));
  }, []);

  // Check type field operations
  const addCheckTypeField = useCallback((field: Omit<CheckTypeField, 'id'>) => {
    const newField: CheckTypeField = { ...field, id: buildUniqueId('ctfield') };
    setSettings((prev) => ({
      ...prev,
      checkTypeFields: [...(prev.checkTypeFields || []), newField],
    }));
    return newField;
  }, []);

  const updateCheckTypeField = useCallback((id: string, updates: Partial<CheckTypeField>) => {
    setSettings((prev) => ({
      ...prev,
      checkTypeFields: (prev.checkTypeFields || []).map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
  }, []);

  const deleteCheckTypeField = useCallback((id: string) => {
    setSettings((prev) => ({
      ...prev,
      checkTypeFields: (prev.checkTypeFields || []).filter((f) => f.id !== id),
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(getDefaultSettings());
  }, []);

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
    deleteUserPermission,
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
