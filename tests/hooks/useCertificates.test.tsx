import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCertificates } from '@/hooks/useCertificates';

describe('useCertificates', () => {
  beforeEach(() => {
    localStorage.clear();
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
});
