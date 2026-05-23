import { useState, useEffect, useCallback, useMemo } from 'react';
import { SafetyCertificate, calculateExpiryDate, isCertificateExpiringSoon, isCertificateExpired } from '@/types/certificates';

const STORAGE_KEY = 'safeguard_certificates';

type StoredCertificate = Omit<SafetyCertificate, 'certificationDate' | 'expiryDate'> & {
  certificationDate: string | Date;
  expiryDate: string | Date;
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(certificates));
  }, [certificates]);

  const addCertificate = useCallback((cert: Omit<SafetyCertificate, 'id' | 'expiryDate'>) => {
    const newCert: SafetyCertificate = {
      ...cert,
      id: `cert-${Date.now()}`,
      expiryDate: calculateExpiryDate(cert.certificationDate),
    };
    setCertificates(prev => [...prev, newCert]);
    return newCert;
  }, []);

  const updateCertificate = useCallback((id: string, updates: Partial<SafetyCertificate>) => {
    setCertificates(prev => prev.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, ...updates };
      if (updates.certificationDate) {
        updated.expiryDate = calculateExpiryDate(updates.certificationDate);
      }
      return updated;
    }));
  }, []);

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
  };
}
