import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { ComplianceCheck } from '@/types/admin';

const STORAGE_KEY = 'safeguard_admin_settings';

vi.mock('@/lib/auditLog', () => ({
  logAuditEvent: vi.fn(),
}));

vi.mock('@/lib/notifications', () => ({
  notifyComplianceChecksAssigned: vi.fn(),
}));

vi.mock('@/utils/complianceAssignments', () => ({
  resolveCheckAssignedUsers: vi.fn(() => []),
}));

describe('useAdminSettings persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('persists training assignment details under complianceChecks[].trainingDetails', () => {
    const { result } = renderHook(() => useAdminSettings());

    const dueDate = new Date('2026-06-15T09:00:00.000Z');

    const checkPayload: Omit<ComplianceCheck, 'id'> = {
      name: 'Training: Alex Brown - Fire Marshall (Level 2)',
      description: 'Certificate: Fire Marshall | Level: 2',
      frequency: 'monthly',
      buildingIds: [],
      floorIds: [],
      areaIds: [],
      nextDue: dueDate,
      status: 'pending',
      category: 'training',
      assignedUsers: ['perm-2'],
      isRecurring: false,
      recurrencePattern: 'none',
      reminderDaysBefore: 1,
      trainingDetails: {
        participantId: 'perm-2',
        participantName: 'Alex Brown',
        certificateType: 'fire_marshall',
        certificateLabel: 'Fire Marshall',
        level: '2',
        assignedDate: dueDate,
      },
    };

    let createdId = '';
    act(() => {
      const created = result.current.addComplianceCheck(checkPayload);
      createdId = created.id;
    });

    const storedRaw = localStorage.getItem(STORAGE_KEY);
    expect(storedRaw).not.toBeNull();

    const stored = JSON.parse(storedRaw as string) as {
      complianceChecks: Array<{
        id: string;
        trainingDetails?: {
          participantId: string;
          certificateType: string;
          certificateLabel: string;
          level: string;
          assignedDate?: string;
        };
      }>;
    };

    const savedCheck = stored.complianceChecks.find((entry) => entry.id === createdId);
    expect(savedCheck).toBeDefined();
    expect(savedCheck?.trainingDetails).toBeDefined();
    expect(savedCheck?.trainingDetails?.participantId).toBe('perm-2');
    expect(savedCheck?.trainingDetails?.certificateType).toBe('fire_marshall');
    expect(savedCheck?.trainingDetails?.certificateLabel).toBe('Fire Marshall');
    expect(savedCheck?.trainingDetails?.level).toBe('2');
    expect(savedCheck?.trainingDetails?.assignedDate).toBe('2026-06-15T09:00:00.000Z');

    const stateCheck = result.current.settings.complianceChecks.find((entry) => entry.id === createdId);
    expect(stateCheck?.trainingDetails?.assignedDate).toBeInstanceOf(Date);
  });

  it('persists training outcome updates to the same trainingDetails object', () => {
    const { result } = renderHook(() => useAdminSettings());

    const dueDate = new Date('2026-06-15T09:00:00.000Z');
    const followUpDate = new Date('2026-06-22T10:00:00.000Z');
    const outcomeAt = new Date('2026-06-15T10:00:00.000Z');

    let createdId = '';
    act(() => {
      const created = result.current.addComplianceCheck({
        name: 'Training: Alex Brown - Fire Marshall (Level 2)',
        description: 'Certificate: Fire Marshall | Level: 2',
        frequency: 'monthly',
        buildingIds: [],
        floorIds: [],
        areaIds: [],
        nextDue: dueDate,
        status: 'pending',
        category: 'training',
        assignedUsers: ['perm-2'],
        isRecurring: false,
        recurrencePattern: 'none',
        reminderDaysBefore: 1,
        trainingDetails: {
          participantId: 'perm-2',
          participantName: 'Alex Brown',
          certificateType: 'fire_marshall',
          certificateLabel: 'Fire Marshall',
          level: '2',
          assignedDate: dueDate,
        },
      });
      createdId = created.id;
    });

    act(() => {
      result.current.updateComplianceCheck(createdId, {
        trainingDetails: {
          participantId: 'perm-2',
          participantName: 'Alex Brown',
          certificateType: 'fire_marshall',
          certificateLabel: 'Fire Marshall',
          level: '2',
          assignedDate: dueDate,
          lastOutcomeStatus: 'not_done',
          lastOutcomeAt: outcomeAt,
          lastOutcomeReason: 'Participant unavailable',
          followUpDate,
        },
      });
    });

    const storedRaw = localStorage.getItem(STORAGE_KEY);
    const stored = JSON.parse(storedRaw as string) as {
      complianceChecks: Array<{
        id: string;
        trainingDetails?: {
          lastOutcomeStatus?: string;
          lastOutcomeAt?: string;
          lastOutcomeReason?: string;
          followUpDate?: string;
        };
      }>;
    };

    const savedCheck = stored.complianceChecks.find((entry) => entry.id === createdId);
    expect(savedCheck?.trainingDetails?.lastOutcomeStatus).toBe('not_done');
    expect(savedCheck?.trainingDetails?.lastOutcomeAt).toBe('2026-06-15T10:00:00.000Z');
    expect(savedCheck?.trainingDetails?.lastOutcomeReason).toBe('Participant unavailable');
    expect(savedCheck?.trainingDetails?.followUpDate).toBe('2026-06-22T10:00:00.000Z');
  });

  it('rehydrates trainingDetails date fields as Date objects from storage', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        buildings: [],
        userPermissions: [],
        healthOfficialsRequiredDays: ['monday'],
        safetyCheckItems: [],
        complianceCategories: [],
        customIncidentFields: [],
        checkTypeFields: [],
        complianceScoring: {
          weights: {
            checksQuality: 40,
            officialCoverage: 20,
            drillSuccess: 30,
            areaReportCoverage: 10,
          },
          checksPartialCredit: 0.5,
          overduePenaltyPerCheck: 0.5,
          drillFailureThresholdPercent: 50,
          areaReportPeriod: 'monthly',
        },
        complianceChecks: [
          {
            id: 'check-1',
            name: 'Training: Alex Brown - Fire Marshall (Level 2)',
            description: 'Certificate: Fire Marshall | Level: 2',
            frequency: 'monthly',
            buildingIds: [],
            floorIds: [],
            areaIds: [],
            nextDue: '2026-06-15T09:00:00.000Z',
            status: 'pending',
            category: 'training',
            assignedUsers: ['perm-2'],
            isRecurring: false,
            recurrencePattern: 'none',
            reminderDaysBefore: 1,
            trainingDetails: {
              participantId: 'perm-2',
              participantName: 'Alex Brown',
              certificateType: 'fire_marshall',
              certificateLabel: 'Fire Marshall',
              level: '2',
              assignedDate: '2026-06-15T09:00:00.000Z',
              lastOutcomeStatus: 'not_done',
              lastOutcomeAt: '2026-06-15T10:00:00.000Z',
              lastOutcomeReason: 'Participant unavailable',
              followUpDate: '2026-06-22T10:00:00.000Z',
            },
          },
        ],
      }),
    );

    const { result } = renderHook(() => useAdminSettings());
    const check = result.current.settings.complianceChecks[0];

    expect(check.trainingDetails?.assignedDate).toBeInstanceOf(Date);
    expect(check.trainingDetails?.lastOutcomeAt).toBeInstanceOf(Date);
    expect(check.trainingDetails?.followUpDate).toBeInstanceOf(Date);
  });

  it('persists added and updated user permissions in admin settings storage', () => {
    const { result } = renderHook(() => useAdminSettings());

    let permissionId = '';
    act(() => {
      const created = result.current.addUserPermission({
        userId: 'auth-user-22',
        userName: 'Jordan Keeper',
        email: 'jordan.keeper@example.com',
        role: 'reporter',
        buildingAccess: ['building-1'],
        workDays: ['monday', 'tuesday'],
        safetyRoles: ['first_aider'],
        canStartDrills: false,
        canResolveIncidents: false,
        canManageUsers: false,
      });
      permissionId = created.id;
    });

    act(() => {
      result.current.updateUserPermission(permissionId, {
        role: 'responder',
        canStartDrills: true,
        canResolveIncidents: true,
      });
    });

    const storedRaw = localStorage.getItem(STORAGE_KEY);
    const stored = JSON.parse(storedRaw as string) as {
      userPermissions: Array<{
        id: string;
        email: string;
        role: string;
        canStartDrills: boolean;
        canResolveIncidents: boolean;
        createdAt: string;
        updatedAt: string;
      }>;
    };

    const saved = stored.userPermissions.find((entry) => entry.id === permissionId);
    expect(saved).toBeDefined();
    expect(saved?.email).toBe('jordan.keeper@example.com');
    expect(saved?.role).toBe('responder');
    expect(saved?.canStartDrills).toBe(true);
    expect(saved?.canResolveIncidents).toBe(true);
    expect(typeof saved?.createdAt).toBe('string');
    expect(typeof saved?.updatedAt).toBe('string');
  });

  it('upserts user permission by identity and normalizes email in storage', () => {
    const { result } = renderHook(() => useAdminSettings());

    act(() => {
      result.current.upsertUserPermissionByIdentity({
        userId: 'auth-user-99',
        userName: 'Case Normalized',
        email: 'Case.User@Example.COM',
        role: 'viewer',
        buildingAccess: [],
        primaryFloorId: undefined,
        primaryAreaId: undefined,
        workDays: ['wednesday'],
        safetyRoles: [],
        canStartDrills: false,
        canResolveIncidents: false,
        canManageUsers: false,
      });
    });

    const storedRaw = localStorage.getItem(STORAGE_KEY);
    const stored = JSON.parse(storedRaw as string) as {
      userPermissions: Array<{
        userId: string;
        email: string;
      }>;
    };

    const saved = stored.userPermissions.find((entry) => entry.userId === 'auth-user-99');
    expect(saved).toBeDefined();
    expect(saved?.email).toBe('case.user@example.com');
  });

  it('persists branding updates for corporate customization', () => {
    const { result } = renderHook(() => useAdminSettings());

    act(() => {
      result.current.updateBranding({
        appName: 'Acme Safety Hub',
        appShortName: 'AcmeSafe',
        faviconUrl: '/acme-favicon.svg',
        themeColor: '#123456',
      });
    });

    const storedRaw = localStorage.getItem(STORAGE_KEY);
    expect(storedRaw).not.toBeNull();

    const stored = JSON.parse(storedRaw as string) as {
      branding?: {
        appName?: string;
        appShortName?: string;
        faviconUrl?: string;
        themeColor?: string;
      };
    };

    expect(stored.branding?.appName).toBe('Acme Safety Hub');
    expect(stored.branding?.appShortName).toBe('AcmeSafe');
    expect(stored.branding?.faviconUrl).toBe('/acme-favicon.svg');
    expect(stored.branding?.themeColor).toBe('#123456');
  });
});
