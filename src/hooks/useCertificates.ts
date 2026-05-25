import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SafetyCertificate,
  CertificateType,
  CertificateValidityYearsByType,
  DEFAULT_CERTIFICATE_VALIDITY_BY_TYPE,
  calculateExpiryDate,
  isCertificateExpiringSoon,
  isCertificateExpired,
} from '@/types/certificates';
import { SafetyRole } from '@/types/admin';

const STORAGE_KEY = 'safeguard_certificates';
const VALIDITY_STORAGE_KEY = 'safeguard_certificate_validity_by_type';
const CERTIFICATES_UPDATED_EVENT = 'safeguard_certificates_updated';
const CERTIFICATE_VALIDITY_UPDATED_EVENT = 'safeguard_certificate_validity_updated';
const ADMIN_SETTINGS_KEY = 'safeguard_admin_settings';
const ADMIN_SETTINGS_UPDATED_EVENT = 'safeguard_admin_settings_updated';

const CERTIFICATE_TO_SAFETY_ROLE_MAP: Partial<Record<CertificateType, SafetyRole>> = {
  fire_marshall: 'fire_marshall',
  evacuation_warden: 'evacuation_warden',
  first_aider: 'first_aider',
  health_safety_officer: 'health_safety_officer',
};

type StoredCertificate = Omit<SafetyCertificate, 'certificationDate' | 'expiryDate'> & {
  certificationDate: string | Date;
  expiryDate: string | Date;
};

const parseStoredValidityConfig = (raw: string | null): CertificateValidityYearsByType => {
  if (!raw) {
    return DEFAULT_CERTIFICATE_VALIDITY_BY_TYPE;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Record<CertificateType, unknown>>;
    const next: CertificateValidityYearsByType = { ...DEFAULT_CERTIFICATE_VALIDITY_BY_TYPE };

    (Object.keys(DEFAULT_CERTIFICATE_VALIDITY_BY_TYPE) as CertificateType[]).forEach((type) => {
      const value = parsed[type];
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        next[type] = Math.round(value);
      }
    });

    return next;
  } catch {
    return DEFAULT_CERTIFICATE_VALIDITY_BY_TYPE;
  }
};

export function useCertificates() {
  const [certificates, setCertificates] = useState<SafetyCertificate[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as unknown;
        if (!Array.isArray(parsed)) {
          return [];
        }

        return (parsed as StoredCertificate[]).map((c) => ({
          ...c,
          certificationDate: new Date(c.certificationDate),
          expiryDate: new Date(c.expiryDate),
        }));
      } catch {
        return [];
      }
    }
    return [];
  });

  const [certificateValidityYearsByType, setCertificateValidityYearsByType] = useState<CertificateValidityYearsByType>(() =>
    parseStoredValidityConfig(localStorage.getItem(VALIDITY_STORAGE_KEY)),
  );

  const syncSafetyRoleForCertificate = useCallback((data: {
    userId: string;
    email: string;
    certificateType: CertificateType;
  }) => {
    const mappedRole = CERTIFICATE_TO_SAFETY_ROLE_MAP[data.certificateType];
    if (!mappedRole) {
      return;
    }

    const raw = localStorage.getItem(ADMIN_SETTINGS_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        userPermissions?: Array<{
          id: string;
          userId: string;
          email: string;
          safetyRoles?: SafetyRole[];
          [key: string]: unknown;
        }>;
        [key: string]: unknown;
      };

      if (!Array.isArray(parsed.userPermissions)) {
        return;
      }

      const normalizedEmail = data.email.trim().toLowerCase();
      const hasIdOrUserIdMatch = parsed.userPermissions.some(
        (permission) => permission.id === data.userId || permission.userId === data.userId,
      );
      let changed = false;

      const nextPermissions = parsed.userPermissions.map((permission) => {
        const matchesById = permission.id === data.userId || permission.userId === data.userId;
        const matchesByEmail =
          !!normalizedEmail && permission.email?.trim().toLowerCase() === normalizedEmail;

        const isTarget = hasIdOrUserIdMatch ? matchesById : matchesByEmail;

        if (!isTarget) {
          return permission;
        }

        const currentRoles = Array.isArray(permission.safetyRoles) ? permission.safetyRoles : [];
        if (currentRoles.includes(mappedRole)) {
          return permission;
        }

        changed = true;
        return {
          ...permission,
          safetyRoles: [...currentRoles, mappedRole],
          updatedAt: new Date(),
        };
      });

      if (!changed) {
        return;
      }

      localStorage.setItem(
        ADMIN_SETTINGS_KEY,
        JSON.stringify({
          ...parsed,
          userPermissions: nextPermissions,
        }),
      );
      window.dispatchEvent(new CustomEvent(ADMIN_SETTINGS_UPDATED_EVENT));
    } catch {
      // Ignore malformed settings payloads.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(certificates));
    window.dispatchEvent(new CustomEvent(CERTIFICATES_UPDATED_EVENT));
  }, [certificates]);

  useEffect(() => {
    localStorage.setItem(VALIDITY_STORAGE_KEY, JSON.stringify(certificateValidityYearsByType));
    window.dispatchEvent(new CustomEvent(CERTIFICATE_VALIDITY_UPDATED_EVENT));
  }, [certificateValidityYearsByType]);

  useEffect(() => {
    const syncCertificatesFromStorage = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        if (certificates.length > 0) {
          setCertificates([]);
        }
        return;
      }

      try {
        const parsed = JSON.parse(stored) as unknown;
        if (!Array.isArray(parsed)) {
          return;
        }

        const next = (parsed as StoredCertificate[]).map((c) => ({
          ...c,
          certificationDate: new Date(c.certificationDate),
          expiryDate: new Date(c.expiryDate),
        }));

        const currentSerialized = JSON.stringify(certificates);
        if (currentSerialized !== stored) {
          setCertificates(next);
        }
      } catch {
        // Ignore malformed external writes.
      }
    };

    const syncValidityFromStorage = () => {
      const stored = localStorage.getItem(VALIDITY_STORAGE_KEY);
      const next = parseStoredValidityConfig(stored);

      const currentSerialized = JSON.stringify(certificateValidityYearsByType);
      const nextSerialized = JSON.stringify(next);

      if (currentSerialized !== nextSerialized) {
        setCertificateValidityYearsByType(next);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === STORAGE_KEY) {
        syncCertificatesFromStorage();
      }

      if (!event.key || event.key === VALIDITY_STORAGE_KEY) {
        syncValidityFromStorage();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(CERTIFICATES_UPDATED_EVENT, syncCertificatesFromStorage);
    window.addEventListener(CERTIFICATE_VALIDITY_UPDATED_EVENT, syncValidityFromStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(CERTIFICATES_UPDATED_EVENT, syncCertificatesFromStorage);
      window.removeEventListener(CERTIFICATE_VALIDITY_UPDATED_EVENT, syncValidityFromStorage);
    };
  }, [certificates, certificateValidityYearsByType]);

  const addCertificate = useCallback((cert: Omit<SafetyCertificate, 'id' | 'expiryDate'>) => {
    const validityYears = certificateValidityYearsByType[cert.certificateType] ?? DEFAULT_CERTIFICATE_VALIDITY_BY_TYPE[cert.certificateType];
    const newCert: SafetyCertificate = {
      ...cert,
      id: `cert-${Date.now()}`,
      expiryDate: calculateExpiryDate(cert.certificationDate, validityYears),
    };
    setCertificates(prev => [...prev, newCert]);
    syncSafetyRoleForCertificate({
      userId: cert.userId,
      email: cert.email,
      certificateType: cert.certificateType,
    });
    return newCert;
  }, [certificateValidityYearsByType, syncSafetyRoleForCertificate]);

  const updateCertificate = useCallback((id: string, updates: Partial<SafetyCertificate>) => {
    const existing = certificates.find((entry) => entry.id === id);

    setCertificates(prev => prev.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, ...updates };
      if (updates.certificationDate || updates.certificateType) {
        const targetType = updates.certificateType ?? c.certificateType;
        const targetDate = updates.certificationDate ?? c.certificationDate;
        const validityYears = certificateValidityYearsByType[targetType] ?? DEFAULT_CERTIFICATE_VALIDITY_BY_TYPE[targetType];
        updated.expiryDate = calculateExpiryDate(targetDate, validityYears);
      }
      return updated;
    }));

    if (existing) {
      syncSafetyRoleForCertificate({
        userId: updates.userId ?? existing.userId,
        email: updates.email ?? existing.email,
        certificateType: updates.certificateType ?? existing.certificateType,
      });
    }
  }, [certificateValidityYearsByType, certificates, syncSafetyRoleForCertificate]);

  const updateCertificateValidityYears = useCallback((certificateType: CertificateType, years: number) => {
    const normalized = Math.max(1, Math.min(10, Math.round(years)));

    setCertificateValidityYearsByType((prev) => ({
      ...prev,
      [certificateType]: normalized,
    }));

    setCertificates((prev) => prev.map((certificate) => {
      if (certificate.certificateType !== certificateType) {
        return certificate;
      }

      return {
        ...certificate,
        expiryDate: calculateExpiryDate(certificate.certificationDate, normalized),
      };
    }));
  }, []);

  const upsertCertificateForTrainingPass = useCallback((data: {
    userId: string;
    userName: string;
    email: string;
    certificateType: CertificateType;
    certificationDate: Date;
  }) => {
    const validityYears =
      certificateValidityYearsByType[data.certificateType] ?? DEFAULT_CERTIFICATE_VALIDITY_BY_TYPE[data.certificateType];

    const existing = certificates.find((certificate) =>
      certificate.userId === data.userId && certificate.certificateType === data.certificateType,
    );

    if (existing) {
      const nextCert = {
        ...existing,
        userName: data.userName,
        email: data.email,
        certificationDate: data.certificationDate,
        expiryDate: calculateExpiryDate(data.certificationDate, validityYears),
        notes: 'Updated from passed training record',
      };
      setCertificates((prev) => prev.map((certificate) => (certificate.id === existing.id ? nextCert : certificate)));
      syncSafetyRoleForCertificate({
        userId: data.userId,
        email: data.email,
        certificateType: data.certificateType,
      });
      return nextCert;
    }

    const newCert: SafetyCertificate = {
      id: `cert-${Date.now()}`,
      userId: data.userId,
      userName: data.userName,
      email: data.email,
      certificateType: data.certificateType,
      certificationDate: data.certificationDate,
      expiryDate: calculateExpiryDate(data.certificationDate, validityYears),
      issuedBy: 'Training completion',
      notes: 'Created from passed training record',
    };
    setCertificates((prev) => [...prev, newCert]);
    syncSafetyRoleForCertificate({
      userId: data.userId,
      email: data.email,
      certificateType: data.certificateType,
    });
    return newCert;
  }, [certificates, certificateValidityYearsByType, syncSafetyRoleForCertificate]);

  const deleteCertificate = useCallback((id: string) => {
    setCertificates(prev => prev.filter(c => c.id !== id));
  }, []);

  const expiringSoon = useMemo(() =>
    certificates.filter(c => isCertificateExpiringSoon(c.expiryDate)),
    [certificates]
  );

  const expired = useMemo(() =>
    certificates.filter(c => isCertificateExpired(c.expiryDate)),
    [certificates]
  );

  const getCertificatesForUser = useCallback((userId: string) =>
    certificates.filter(c => c.userId === userId),
    [certificates]
  );

  return {
    certificates,
    addCertificate,
    updateCertificate,
    deleteCertificate,
    expiringSoon,
    expired,
    getCertificatesForUser,
    certificateValidityYearsByType,
    updateCertificateValidityYears,
    upsertCertificateForTrainingPass,
  };
}
