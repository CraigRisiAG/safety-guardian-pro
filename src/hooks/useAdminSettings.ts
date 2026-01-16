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
import { buildings } from '@/data/mockData';

const STORAGE_KEY = 'safeguard_admin_settings';

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
});

export function useAdminSettings() {
  const [settings, setSettings] = useState<AdminSettings>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        return {
          ...parsed,
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
          })),
        };
      } catch {
        return getDefaultSettings();
      }
    }
    return getDefaultSettings();
  });

  const [isLoading, setIsLoading] = useState(false);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Building operations
  const addBuilding = useCallback((building: Omit<CustomBuilding, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newBuilding: CustomBuilding = {
      ...building,
      id: `building-${Date.now()}`,
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
    // Reset
    resetToDefaults,
  };
}
