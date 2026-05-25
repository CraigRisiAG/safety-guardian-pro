import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CertificateExpiryWidget } from '@/components/dashboard/CertificateExpiryWidget';
import { DEFAULT_CERTIFICATE_VALIDITY_BY_TYPE } from '@/types/certificates';

const mockUseCertificates = vi.fn();
const mockUseAdminSettings = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('@/hooks/useCertificates', () => ({
  useCertificates: () => mockUseCertificates(),
}));

vi.mock('@/hooks/useAdminSettings', () => ({
  useAdminSettings: () => mockUseAdminSettings(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('CertificateExpiryWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupDefaults = () => {
    const now = new Date();

    mockUseAuth.mockReturnValue({
      user: {
        id: 'admin-1',
        email: 'admin@safeguard.local',
        name: 'Admin User',
      },
    });

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
            name: 'Fire Safety Refresher',
            trainingDetails: {
              participantId: 'perm-admin',
              participantName: 'Admin User',
              certificateType: 'fire_marshall',
              certificateLabel: 'Fire Marshall',
              level: '1',
              lastOutcomeStatus: 'fail',
            },
          },
          {
            id: 't2',
            category: 'training',
            status: 'completed',
            nextDue: new Date(now.getTime() + 86400000),
            name: 'Emergency Evacuation',
            trainingDetails: {
              participantId: 'perm-admin',
              participantName: 'Admin User',
              certificateType: 'evacuation_warden',
              certificateLabel: 'Evacuation Marshall',
              level: '1',
              lastOutcomeStatus: 'pass',
            },
          },
        ],
        userPermissions: [
          {
            id: 'perm-admin',
            userId: 'admin-1',
            userName: 'Admin User',
            email: 'admin@safeguard.local',
            role: 'super_admin',
            buildingAccess: ['b1'],
            primaryFloorId: 'f1',
            primaryAreaId: 'a1',
            workDays: ['monday'],
            safetyRoles: ['health_safety_officer'],
            canStartDrills: true,
            canResolveIncidents: true,
            canManageUsers: true,
            createdAt: now,
            updatedAt: now,
          },
        ],
        buildings: [
          {
            id: 'b1',
            name: 'Main Building',
            createdAt: now,
            updatedAt: now,
            floors: [
              {
                id: 'f1',
                buildingId: 'b1',
                name: 'Floor 1',
                level: 1,
                areas: [{ id: 'a1', floorId: 'f1', name: 'Reception' }],
              },
            ],
          },
        ],
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
    expect(screen.getByText('Passed')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Follow-Up')).toBeInTheDocument();
  });

  it('shows all people in training stat drill-down for super admin', () => {
    const now = new Date();

    mockUseAuth.mockReturnValue({
      user: {
        id: 'admin-1',
        email: 'admin@safeguard.local',
        name: 'Admin User',
      },
    });

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
        buildings: [
          {
            id: 'b1',
            name: 'Main Building',
            createdAt: now,
            updatedAt: now,
            floors: [
              { id: 'f1', buildingId: 'b1', name: 'Floor 1', level: 1, areas: [{ id: 'a1', floorId: 'f1', name: 'Reception' }] },
              { id: 'f2', buildingId: 'b1', name: 'Floor 2', level: 2, areas: [{ id: 'a2', floorId: 'f2', name: 'Engineering' }] },
            ],
          },
        ],
        userPermissions: [
          {
            id: 'perm-admin', userId: 'admin-1', userName: 'Admin User', email: 'admin@safeguard.local', role: 'super_admin',
            buildingAccess: ['b1'], primaryFloorId: 'f1', primaryAreaId: 'a1', workDays: ['monday'], safetyRoles: ['health_safety_officer'],
            canStartDrills: true, canResolveIncidents: true, canManageUsers: true, createdAt: now, updatedAt: now,
          },
          {
            id: 'perm-a', userId: 'u-a', userName: 'Alice Floor1', email: 'alice@example.com', role: 'viewer',
            buildingAccess: ['b1'], primaryFloorId: 'f1', primaryAreaId: 'a1', workDays: ['monday'], safetyRoles: [],
            canStartDrills: false, canResolveIncidents: false, canManageUsers: false, createdAt: now, updatedAt: now,
          },
          {
            id: 'perm-b', userId: 'u-b', userName: 'Bob Floor2', email: 'bob@example.com', role: 'viewer',
            buildingAccess: ['b1'], primaryFloorId: 'f2', primaryAreaId: 'a2', workDays: ['monday'], safetyRoles: [],
            canStartDrills: false, canResolveIncidents: false, canManageUsers: false, createdAt: now, updatedAt: now,
          },
        ],
        complianceChecks: [
          {
            id: 't-a', name: 'Training A', description: '', frequency: 'monthly', buildingIds: ['b1'], floorIds: ['f1'], areaIds: ['a1'],
            nextDue: new Date(now.getTime() + 86400000), assignedUsers: ['perm-a'], status: 'pending', category: 'training', isRecurring: false,
            recurrencePattern: 'none', reminderDaysBefore: 1,
            trainingDetails: { participantId: 'perm-a', participantName: 'Alice Floor1', certificateType: 'fire_marshall', certificateLabel: 'Fire Marshall', level: '1' },
          },
          {
            id: 't-b', name: 'Training B', description: '', frequency: 'monthly', buildingIds: ['b1'], floorIds: ['f2'], areaIds: ['a2'],
            nextDue: new Date(now.getTime() + 86400000), assignedUsers: ['perm-b'], status: 'pending', category: 'training', isRecurring: false,
            recurrencePattern: 'none', reminderDaysBefore: 1,
            trainingDetails: { participantId: 'perm-b', participantName: 'Bob Floor2', certificateType: 'first_aider', certificateLabel: 'First Aid', level: '1' },
          },
        ],
      },
    });

    render(<CertificateExpiryWidget />);

    fireEvent.click(screen.getByRole('button', { name: /Assigned/ }));

    expect(screen.getByText('Assigned Training')).toBeInTheDocument();
    expect(screen.getByText('Alice Floor1')).toBeInTheDocument();
    expect(screen.getByText('Bob Floor2')).toBeInTheDocument();
  });

  it('limits H&S officer training people drill-down to their own floor', () => {
    const now = new Date();

    mockUseAuth.mockReturnValue({
      user: {
        id: 'officer-1',
        email: 'officer@example.com',
        name: 'HS Officer',
      },
    });

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
        buildings: [
          {
            id: 'b1',
            name: 'Main Building',
            createdAt: now,
            updatedAt: now,
            floors: [
              { id: 'f1', buildingId: 'b1', name: 'Floor 1', level: 1, areas: [{ id: 'a1', floorId: 'f1', name: 'Reception' }] },
              { id: 'f2', buildingId: 'b1', name: 'Floor 2', level: 2, areas: [{ id: 'a2', floorId: 'f2', name: 'Engineering' }] },
            ],
          },
        ],
        userPermissions: [
          {
            id: 'perm-officer', userId: 'officer-1', userName: 'HS Officer', email: 'officer@example.com', role: 'admin',
            buildingAccess: ['b1'], primaryFloorId: 'f1', primaryAreaId: 'a1', workDays: ['monday'], safetyRoles: ['health_safety_officer'],
            canStartDrills: true, canResolveIncidents: true, canManageUsers: true, createdAt: now, updatedAt: now,
          },
          {
            id: 'perm-a', userId: 'u-a', userName: 'Alice Floor1', email: 'alice@example.com', role: 'viewer',
            buildingAccess: ['b1'], primaryFloorId: 'f1', primaryAreaId: 'a1', workDays: ['monday'], safetyRoles: [],
            canStartDrills: false, canResolveIncidents: false, canManageUsers: false, createdAt: now, updatedAt: now,
          },
          {
            id: 'perm-b', userId: 'u-b', userName: 'Bob Floor2', email: 'bob@example.com', role: 'viewer',
            buildingAccess: ['b1'], primaryFloorId: 'f2', primaryAreaId: 'a2', workDays: ['monday'], safetyRoles: [],
            canStartDrills: false, canResolveIncidents: false, canManageUsers: false, createdAt: now, updatedAt: now,
          },
        ],
        complianceChecks: [
          {
            id: 't-a', name: 'Training A', description: '', frequency: 'monthly', buildingIds: ['b1'], floorIds: ['f1'], areaIds: ['a1'],
            nextDue: new Date(now.getTime() + 86400000), assignedUsers: ['perm-a'], status: 'pending', category: 'training', isRecurring: false,
            recurrencePattern: 'none', reminderDaysBefore: 1,
            trainingDetails: { participantId: 'perm-a', participantName: 'Alice Floor1', certificateType: 'fire_marshall', certificateLabel: 'Fire Marshall', level: '1' },
          },
          {
            id: 't-b', name: 'Training B', description: '', frequency: 'monthly', buildingIds: ['b1'], floorIds: ['f2'], areaIds: ['a2'],
            nextDue: new Date(now.getTime() + 86400000), assignedUsers: ['perm-b'], status: 'pending', category: 'training', isRecurring: false,
            recurrencePattern: 'none', reminderDaysBefore: 1,
            trainingDetails: { participantId: 'perm-b', participantName: 'Bob Floor2', certificateType: 'first_aider', certificateLabel: 'First Aid', level: '1' },
          },
        ],
      },
    });

    render(<CertificateExpiryWidget />);

    fireEvent.click(screen.getByRole('button', { name: /Assigned/ }));

    expect(screen.getByText('Assigned Training')).toBeInTheDocument();
    expect(screen.getByText('Alice Floor1')).toBeInTheDocument();
    expect(screen.queryByText('Bob Floor2')).not.toBeInTheDocument();
  });

  it('opens the admin certificates popup when H&S Certificates is clicked', () => {
    setupDefaults();

    render(<CertificateExpiryWidget />);

    fireEvent.click(screen.getByRole('button', { name: 'Open H&S certificates' }));

    expect(screen.getByText('Manage certificates using the same controls available in the Admin screen.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Certificate' })).toBeInTheDocument();
  });

  it('does not render when there are no certificates', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'admin-1',
        email: 'admin@safeguard.local',
        name: 'Admin User',
      },
    });

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
        userPermissions: [],
        buildings: [],
      },
    });

    const { container } = render(<CertificateExpiryWidget />);
    expect(container).toBeEmptyDOMElement();
  });
});
