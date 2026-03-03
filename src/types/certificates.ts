// H&S Certificate types

export type CertificateType = 'fire_marshall' | 'evacuation_warden' | 'first_aider' | 'health_safety_officer';

export interface SafetyCertificate {
  id: string;
  userId: string;
  userName: string;
  email: string;
  certificateType: CertificateType;
  certificationDate: Date;
  expiryDate: Date; // 3 years after certification
  certificateNumber?: string;
  issuedBy?: string;
  notes?: string;
}

export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  fire_marshall: 'Fire Marshall',
  evacuation_warden: 'Evacuation Warden',
  first_aider: 'First Aider',
  health_safety_officer: 'H&S Officer',
};

export const CERTIFICATE_VALIDITY_YEARS = 3;
export const CERTIFICATE_EXPIRY_WARNING_MONTHS = 3;

export function calculateExpiryDate(certificationDate: Date): Date {
  const expiry = new Date(certificationDate);
  expiry.setFullYear(expiry.getFullYear() + CERTIFICATE_VALIDITY_YEARS);
  return expiry;
}

export function isCertificateExpiringSoon(expiryDate: Date): boolean {
  const now = new Date();
  const warningDate = new Date();
  warningDate.setMonth(warningDate.getMonth() + CERTIFICATE_EXPIRY_WARNING_MONTHS);
  return expiryDate <= warningDate && expiryDate > now;
}

export function isCertificateExpired(expiryDate: Date): boolean {
  return expiryDate <= new Date();
}
