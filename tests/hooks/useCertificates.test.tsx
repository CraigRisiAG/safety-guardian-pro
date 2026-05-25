import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCertificates } from '@/hooks/useCertificates';

const ADMIN_SETTINGS_KEY = 'safeguard_admin_settings';

describe('useCertificates', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('retroactively syncs roles from existing stored certificates on hook load', async () => {
    localStorage.setItem(
      'safeguard_certificates',
      JSON.stringify([
        {
          id: 'cert-existing-1',
          userId: 'participant-user-1',
          userName: 'Reception Officer',
          email: 'reception@example.com',
          certificateType: 'fire_marshall',
          certificationDate: '2026-01-05T00:00:00.000Z',
          expiryDate: '2029-01-05T00:00:00.000Z',
        },
        {
          id: 'cert-existing-2',
          userId: 'participant-user-1',
          userName: 'Reception Officer',
          email: 'reception@example.com',
          certificateType: 'first_aider',
          certificationDate: '2026-02-10T00:00:00.000Z',
          expiryDate: '2029-02-10T00:00:00.000Z',
        },
      ]),
    );

    localStorage.setItem(
      ADMIN_SETTINGS_KEY,
      JSON.stringify({
        buildings: [],
        userPermissions: [
          {
            id: 'perm-reception-1',
            userId: 'participant-user-1',
            userName: 'Reception Officer',
            email: 'reception@example.com',
            role: 'viewer',
            buildingAccess: [],
            primaryFloorId: 'floor-ground',
            primaryAreaId: 'area-reception',
            workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            safetyRoles: [],
            canStartDrills: false,
            canResolveIncidents: false,
            canManageUsers: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
        healthOfficialsRequiredDays: ['monday'],
        complianceChecks: [],
        safetyCheckItems: [],
        complianceCategories: [],
        customIncidentFields: [],
        checkTypeFields: [],
      }),
    );

    renderHook(() => useCertificates());

    await waitFor(() => {
      const settings = JSON.parse(localStorage.getItem(ADMIN_SETTINGS_KEY) || '{}');
      const roles: string[] = settings.userPermissions[0].safetyRoles;
      expect(roles).toContain('fire_marshall');
      expect(roles).toContain('first_aider');
    });
  });

  it('uses configured validity years when creating and recalculating certificate expiry', () => {
    const { result } = renderHook(() => useCertificates());

    const certificationDate = new Date('2026-05-25T00:00:00.000Z');

    act(() => {
      result.current.updateCertificateValidityYears('fire_marshall', 5);
    });

    let certId = '';
    act(() => {
      const cert = result.current.addCertificate({
        userId: 'perm-1',
        userName: 'Taylor Safety',
        email: 'taylor@example.com',
        certificateType: 'fire_marshall',
        certificationDate,
      });
      certId = cert.id;
    });

    const created = result.current.certificates.find((entry) => entry.id === certId);
    expect(created?.expiryDate.toISOString()).toBe('2031-05-25T00:00:00.000Z');

    act(() => {
      result.current.updateCertificateValidityYears('fire_marshall', 2);
    });

    const updated = result.current.certificates.find((entry) => entry.id === certId);
    expect(updated?.expiryDate.toISOString()).toBe('2028-05-25T00:00:00.000Z');
  });

  it('upserts existing certificate on training pass for same user and certificate type', () => {
    const { result } = renderHook(() => useCertificates());

    act(() => {
      result.current.addCertificate({
        userId: 'perm-2',
        userName: 'Alex Brown',
        email: 'alex@example.com',
        certificateType: 'first_aider',
        certificationDate: new Date('2024-05-25T00:00:00.000Z'),
      });
    });

    expect(result.current.certificates).toHaveLength(1);

    act(() => {
      result.current.upsertCertificateForTrainingPass({
        userId: 'perm-2',
        userName: 'Alex Brown',
        email: 'alex@example.com',
        certificateType: 'first_aider',
        certificationDate: new Date('2026-05-25T00:00:00.000Z'),
      });
    });

    expect(result.current.certificates).toHaveLength(1);
    expect(result.current.certificates[0].certificationDate.toISOString()).toBe('2026-05-25T00:00:00.000Z');
    expect(result.current.certificates[0].expiryDate.toISOString()).toBe('2029-05-25T00:00:00.000Z');
  });

  it('creates new certificate on training pass when no existing certificate exists', () => {
    const { result } = renderHook(() => useCertificates());

    act(() => {
      result.current.upsertCertificateForTrainingPass({
        userId: 'perm-3',
        userName: 'Sam Lee',
        email: 'sam@example.com',
        certificateType: 'evac_chair',
        certificationDate: new Date('2026-05-25T00:00:00.000Z'),
      });
    });

    expect(result.current.certificates).toHaveLength(1);
    expect(result.current.certificates[0].certificateType).toBe('evac_chair');
    expect(result.current.certificates[0].expiryDate.toISOString()).toBe('2029-05-25T00:00:00.000Z');
  });

  it('syncs certificate updates across multiple hook instances', async () => {
    const first = renderHook(() => useCertificates());
    const second = renderHook(() => useCertificates());

    expect(first.result.current.certificates).toHaveLength(0);
    expect(second.result.current.certificates).toHaveLength(0);

    act(() => {
      first.result.current.addCertificate({
        userId: 'perm-10',
        userName: 'Jordan Keeper',
        email: 'jordan@example.com',
        certificateType: 'fire_marshall',
        certificationDate: new Date('2026-05-25T00:00:00.000Z'),
      });
    });

    await waitFor(() => {
      expect(second.result.current.certificates).toHaveLength(1);
    });
  });

  it('assigns equivalent safety role in admin settings on certificate upsert', () => {
    localStorage.setItem(
      ADMIN_SETTINGS_KEY,
      JSON.stringify({
        buildings: [],
        userPermissions: [
          {
            id: 'perm-2',
            userId: 'user-2',
            userName: 'Alex Brown',
            email: 'alex@example.com',
            role: 'viewer',
            buildingAccess: [],
            workDays: ['monday'],
            safetyRoles: [],
            canStartDrills: false,
            canResolveIncidents: false,
            canManageUsers: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
        healthOfficialsRequiredDays: ['monday'],
        complianceChecks: [],
        safetyCheckItems: [],
        complianceCategories: [],
        customIncidentFields: [],
        checkTypeFields: [],
      }),
    );

    const { result } = renderHook(() => useCertificates());

    act(() => {
      result.current.upsertCertificateForTrainingPass({
        userId: 'perm-2',
        userName: 'Alex Brown',
        email: 'alex@example.com',
        certificateType: 'first_aider',
        certificationDate: new Date('2026-05-25T00:00:00.000Z'),
      });
    });

    const settings = JSON.parse(localStorage.getItem(ADMIN_SETTINGS_KEY) || '{}');
    expect(settings.userPermissions[0].safetyRoles).toContain('first_aider');
  });

  it('assigns role on manual certificate update and does not duplicate existing roles', () => {
    localStorage.setItem(
      ADMIN_SETTINGS_KEY,
      JSON.stringify({
        buildings: [],
        userPermissions: [
          {
            id: 'perm-7',
            userId: 'user-7',
            userName: 'Jordan Keeper',
            email: 'jordan@example.com',
            role: 'viewer',
            buildingAccess: [],
            workDays: ['monday'],
            safetyRoles: ['fire_marshall'],
            canStartDrills: false,
            canResolveIncidents: false,
            canManageUsers: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
        healthOfficialsRequiredDays: ['monday'],
        complianceChecks: [],
        safetyCheckItems: [],
        complianceCategories: [],
        customIncidentFields: [],
        checkTypeFields: [],
      }),
    );

    const { result } = renderHook(() => useCertificates());

    let certId = '';
    act(() => {
      const cert = result.current.addCertificate({
        userId: 'perm-7',
        userName: 'Jordan Keeper',
        email: 'jordan@example.com',
        certificateType: 'evac_chair',
        certificationDate: new Date('2026-05-25T00:00:00.000Z'),
      });
      certId = cert.id;
    });

    act(() => {
      result.current.updateCertificate(certId, {
        certificateType: 'fire_marshall',
      });
    });

    const settings = JSON.parse(localStorage.getItem(ADMIN_SETTINGS_KEY) || '{}');
    const roles: string[] = settings.userPermissions[0].safetyRoles;
    expect(roles.filter((role) => role === 'fire_marshall')).toHaveLength(1);
  });

  it('syncs role to participant matched by userId even when certificate email is different', () => {
    localStorage.setItem(
      ADMIN_SETTINGS_KEY,
      JSON.stringify({
        buildings: [],
        userPermissions: [
          {
            id: 'perm-completer',
            userId: 'user-completer',
            userName: 'Completing User',
            email: 'completer@example.com',
            role: 'super_admin',
            buildingAccess: [],
            workDays: ['monday'],
            safetyRoles: [],
            canStartDrills: true,
            canResolveIncidents: true,
            canManageUsers: true,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
          {
            id: 'perm-participant',
            userId: 'user-participant',
            userName: 'Participant User',
            email: 'participant@example.com',
            role: 'viewer',
            buildingAccess: [],
            workDays: ['monday'],
            safetyRoles: [],
            canStartDrills: false,
            canResolveIncidents: false,
            canManageUsers: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
        healthOfficialsRequiredDays: ['monday'],
        complianceChecks: [],
        safetyCheckItems: [],
        complianceCategories: [],
        customIncidentFields: [],
        checkTypeFields: [],
      }),
    );

    const { result } = renderHook(() => useCertificates());

    act(() => {
      result.current.upsertCertificateForTrainingPass({
        userId: 'user-participant',
        userName: 'Participant User',
        email: 'completer@example.com',
        certificateType: 'first_aider',
        certificationDate: new Date('2026-05-25T00:00:00.000Z'),
      });
    });

    const settings = JSON.parse(localStorage.getItem(ADMIN_SETTINGS_KEY) || '{}');
    const completerRoles: string[] = settings.userPermissions[0].safetyRoles;
    const participantRoles: string[] = settings.userPermissions[1].safetyRoles;

    expect(participantRoles).toContain('first_aider');
    expect(completerRoles).not.toContain('first_aider');
  });
});
