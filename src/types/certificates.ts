// H&S Certificate types

export type CertificateType =
  | 'fire_marshall'
  | 'evacuation_warden'
  | 'first_aider'
  | 'health_safety_officer'
  | 'evac_chair';

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
  evacuation_warden: 'Evacuation Marshall',
  first_aider: 'First Aid',
  health_safety_officer: 'H&S Officer',
  evac_chair: 'Evac Chair',
};

export const DEFAULT_CERTIFICATE_VALIDITY_YEARS = 3;
export const CERTIFICATE_EXPIRY_WARNING_MONTHS = 3;

export type CertificateValidityYearsByType = Record<CertificateType, number>;

export const DEFAULT_CERTIFICATE_VALIDITY_BY_TYPE: CertificateValidityYearsByType = {
  fire_marshall: DEFAULT_CERTIFICATE_VALIDITY_YEARS,
  evacuation_warden: DEFAULT_CERTIFICATE_VALIDITY_YEARS,
  first_aider: DEFAULT_CERTIFICATE_VALIDITY_YEARS,
  health_safety_officer: DEFAULT_CERTIFICATE_VALIDITY_YEARS,
  evac_chair: DEFAULT_CERTIFICATE_VALIDITY_YEARS,
};

const TRAINING_TO_CERTIFICATE_TYPE_MAP: Record<string, CertificateType> = {
  fire_marshall: 'fire_marshall',
  fire_marshal: 'fire_marshall',
  evacuation: 'evacuation_warden',
  evacuation_warden: 'evacuation_warden',
  evacuation_marshall: 'evacuation_warden',
  evacuation_marshal: 'evacuation_warden',
  first_aid: 'first_aider',
  first_aider: 'first_aider',
  health_safety_officer: 'health_safety_officer',
  hs_officer: 'health_safety_officer',
  evac_chair: 'evac_chair',
};

export function normalizeTrainingCertificateType(value: string): CertificateType | null {
  const normalized = value.trim().toLowerCase();

  if (TRAINING_TO_CERTIFICATE_TYPE_MAP[normalized]) {
    return TRAINING_TO_CERTIFICATE_TYPE_MAP[normalized];
  }

  if (normalized.includes('fire marshal') || normalized.includes('fire marshall')) {
    return 'fire_marshall';
  }
  if (normalized.includes('evacuation marshal') || normalized.includes('evacuation marshall') || normalized.includes('evacuation ward')) {
    return 'evacuation_warden';
  }
  if (normalized.includes('first aid')) {
    return 'first_aider';
  }
  if (normalized.includes('health') && normalized.includes('safety')) {
    return 'health_safety_officer';
  }
  if (normalized.includes('evac chair')) {
    return 'evac_chair';
  }

  return null;
}

export function calculateExpiryDate(certificationDate: Date, validityYears = DEFAULT_CERTIFICATE_VALIDITY_YEARS): Date {
  const expiry = new Date(certificationDate);
  expiry.setFullYear(expiry.getFullYear() + validityYears);
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
