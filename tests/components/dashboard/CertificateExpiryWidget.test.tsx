import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CertificateExpiryWidget } from '@/components/dashboard/CertificateExpiryWidget';
import { DEFAULT_CERTIFICATE_VALIDITY_BY_TYPE } from '@/types/certificates';

const mockUseCertificates = vi.fn();
const mockUseAdminSettings = vi.fn();

vi.mock('@/hooks/useCertificates', () => ({
  useCertificates: () => mockUseCertificates(),
}));

vi.mock('@/hooks/useAdminSettings', () => ({
  useAdminSettings: () => mockUseAdminSettings(),
}));

describe('CertificateExpiryWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupDefaults = () => {
    const now = new Date();

    mockUseCertificates.mockReturnValue({
      certificates: [
        {
          id: 'c1',
          userId: 'u1',
          userName: 'Jane Doe',
          email: 'jane@example.com',
          certificateType: 'fire_marshall',
          certificationDate: now,
          expiryDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
        },
      ],
      expiringSoon: [],
      expired: [],
      addCertificate: vi.fn(),
      updateCertificate: vi.fn(),
      deleteCertificate: vi.fn(),
      getCertificatesForUser: vi.fn(() => []),
      certificateValidityYearsByType: DEFAULT_CERTIFICATE_VALIDITY_BY_TYPE,
      updateCertificateValidityYears: vi.fn(),
      upsertCertificateForTrainingPass: vi.fn(),
    });

    mockUseAdminSettings.mockReturnValue({
      settings: {
        complianceChecks: [
          {
            id: 't1',
            category: 'training',
            status: 'in_progress',
            nextDue: new Date(now.getTime() - 86400000),
            title: 'Fire Safety Refresher',
            trainingDetails: { lastOutcomeStatus: 'fail' },
          },
          {
            id: 't2',
            category: 'training',
            status: 'completed',
            nextDue: new Date(now.getTime() + 86400000),
            title: 'Emergency Evacuation',
            trainingDetails: { lastOutcomeStatus: 'pass' },
          },
        ],
        userPermissions: [],
      },
    });
  };

  it('renders training stats in H&S certificates section', () => {
    setupDefaults();

    render(<CertificateExpiryWidget />);

    expect(screen.getByText('H&S Certificates')).toBeInTheDocument();
    expect(screen.getByText('Training Stats')).toBeInTheDocument();
    expect(screen.getByText('Assigned')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Follow-Up')).toBeInTheDocument();
  });

  it('opens the admin certificates popup when H&S Certificates is clicked', () => {
    setupDefaults();

    render(<CertificateExpiryWidget />);

    fireEvent.click(screen.getByRole('button', { name: 'Open H&S certificates' }));

    expect(screen.getByText('Manage certificates using the same controls available in the Admin screen.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Certificate' })).toBeInTheDocument();
  });

  it('does not render when there are no certificates', () => {
    mockUseCertificates.mockReturnValue({
      certificates: [],
      expiringSoon: [],
      expired: [],
      addCertificate: vi.fn(),
      updateCertificate: vi.fn(),
      deleteCertificate: vi.fn(),
      getCertificatesForUser: vi.fn(() => []),
      certificateValidityYearsByType: DEFAULT_CERTIFICATE_VALIDITY_BY_TYPE,
      updateCertificateValidityYears: vi.fn(),
      upsertCertificateForTrainingPass: vi.fn(),
    });

    mockUseAdminSettings.mockReturnValue({
      settings: {
        complianceChecks: [],
      },
    });

    const { container } = render(<CertificateExpiryWidget />);
    expect(container).toBeEmptyDOMElement();
  });
});
