import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ComplianceCheckForm } from '@/components/dashboard/ComplianceCheckForm';

const mockUpsertCertificateForTrainingPass = vi.fn();
let mockUserPermissions = [
  {
    id: 'perm-1',
    userId: 'user-1',
    userName: 'Taylor Safety',
    email: 'taylor@example.com',
    role: 'super_admin',
    buildingAccess: [],
    workDays: ['monday'],
    safetyRoles: [] as string[],
    canStartDrills: true,
    canResolveIncidents: true,
    canManageUsers: true,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
  },
];

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      name: 'Taylor Safety',
      email: 'taylor@example.com',
    },
  }),
}));

vi.mock('@/hooks/useAdminSettings', () => ({
  useAdminSettings: () => ({
    settings: {
      buildings: [],
      safetyCheckItems: [],
      checkTypeFields: [],
      userPermissions: mockUserPermissions,
    },
    updateComplianceCheck: vi.fn(),
  }),
}));

vi.mock('@/hooks/useCertificates', () => ({
  useCertificates: () => ({
    upsertCertificateForTrainingPass: mockUpsertCertificateForTrainingPass,
    certificateValidityYearsByType: {
      fire_marshall: 3,
      evacuation_warden: 3,
      first_aider: 3,
      health_safety_officer: 3,
      evac_chair: 3,
    },
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ComplianceCheckForm training UX', () => {
  const resetPermissions = (safetyRoles: string[] = []) => {
    mockUserPermissions = [
      {
        id: 'perm-1',
        userId: 'user-1',
        userName: 'Taylor Safety',
        email: 'taylor@example.com',
        role: 'super_admin',
        buildingAccess: [],
        workDays: ['monday'],
        safetyRoles,
        canStartDrills: true,
        canResolveIncidents: true,
        canManageUsers: true,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      },
    ];
  };

  const trainingCheck = {
    id: 'check-training-1',
    name: 'Training: Alex Brown - Fire Marshall (Level 2)',
    description: 'Certificate: Fire Marshall | Level: 2',
    frequency: 'monthly' as const,
    buildingIds: [],
    floorIds: [],
    areaIds: [],
    nextDue: new Date('2026-05-01T00:00:00.000Z'),
    status: 'overdue' as const,
    category: 'training' as const,
    assignedUsers: ['perm-1'],
    isRecurring: false,
    recurrencePattern: 'none' as const,
    reminderDaysBefore: 1,
    trainingDetails: {
      participantId: 'perm-1',
      participantName: 'Alex Brown',
      certificateType: 'fire_marshall',
      certificateLabel: 'Fire Marshall',
      level: '2',
      assignedDate: new Date('2026-05-01T00:00:00.000Z'),
    },
  };

  it('shows training course details and allows completion button for training checks', () => {
    resetPermissions();
    mockUpsertCertificateForTrainingPass.mockReset();

    render(
      <ComplianceCheckForm
        preselectedCheck={trainingCheck}
      />,
    );

    expect(screen.getByText('Course:')).toBeInTheDocument();
    expect(screen.getByText('Fire Marshall')).toBeInTheDocument();
    expect(screen.getByText('Participant:')).toBeInTheDocument();
    expect(screen.getByText('Alex Brown')).toBeInTheDocument();

    const completeButton = screen.getByRole('button', { name: 'Complete Check' });
    expect(completeButton).toBeEnabled();

    fireEvent.click(completeButton);
    expect(screen.getByText('Confirm Passed Training')).toBeInTheDocument();
    expect(screen.getByLabelText('Certification Date *')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm And Complete' }));

    expect(mockUpsertCertificateForTrainingPass).toHaveBeenCalledTimes(1);
    expect(mockUpsertCertificateForTrainingPass).toHaveBeenCalledWith(
      expect.objectContaining({
        certificateType: 'fire_marshall',
        userName: 'Taylor Safety',
        email: 'taylor@example.com',
      }),
    );

  });

  it('reopens the dialog when the same assigned training is started again', () => {
    resetPermissions();
    const { rerender } = render(
      <ComplianceCheckForm preselectedCheck={trainingCheck} openRequestId={1} />,
    );

    expect(screen.getByText('Complete Compliance Check')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Complete Compliance Check')).not.toBeInTheDocument();

    rerender(
      <ComplianceCheckForm preselectedCheck={trainingCheck} openRequestId={2} />,
    );

    expect(screen.getByText('Complete Compliance Check')).toBeInTheDocument();
    expect(screen.getByText('Completing scheduled check:')).toBeInTheDocument();
  });

  it('does not reopen after cancel when request id has not changed', () => {
    resetPermissions();
    const { rerender } = render(
      <ComplianceCheckForm preselectedCheck={trainingCheck} openRequestId={10} />,
    );

    expect(screen.getByText('Complete Compliance Check')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Complete Compliance Check')).not.toBeInTheDocument();

    rerender(
      <ComplianceCheckForm preselectedCheck={trainingCheck} openRequestId={10} />,
    );

    expect(screen.queryByText('Complete Compliance Check')).not.toBeInTheDocument();
  });

  it('reopens for every new request id when starting the same training multiple times', () => {
    resetPermissions();
    const { rerender } = render(
      <ComplianceCheckForm preselectedCheck={trainingCheck} openRequestId={21} />,
    );

    expect(screen.getByText('Complete Compliance Check')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Complete Compliance Check')).not.toBeInTheDocument();

    rerender(
      <ComplianceCheckForm preselectedCheck={trainingCheck} openRequestId={22} />,
    );
    expect(screen.getByText('Complete Compliance Check')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Complete Compliance Check')).not.toBeInTheDocument();

    rerender(
      <ComplianceCheckForm preselectedCheck={trainingCheck} openRequestId={23} />,
    );
    expect(screen.getByText('Complete Compliance Check')).toBeInTheDocument();
  });

  it('does not reassign mapped safety role when participant already has it', () => {
    resetPermissions(['fire_marshall']);
    mockUpsertCertificateForTrainingPass.mockReset();

    render(
      <ComplianceCheckForm
        preselectedCheck={trainingCheck}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Complete Check' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm And Complete' }));

    expect(mockUpsertCertificateForTrainingPass).toHaveBeenCalledTimes(1);
  });

  it('prioritizes the training participant identity over completing user when passing training', () => {
    mockUserPermissions = [
      {
        id: 'perm-1',
        userId: 'user-1',
        userName: 'Taylor Safety',
        email: 'taylor@example.com',
        role: 'super_admin',
        buildingAccess: [],
        workDays: ['monday'],
        safetyRoles: [],
        canStartDrills: true,
        canResolveIncidents: true,
        canManageUsers: true,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      },
      {
        id: 'perm-2',
        userId: 'participant-user-2',
        userName: 'Alex Brown',
        email: 'alex@example.com',
        role: 'viewer',
        buildingAccess: [],
        workDays: ['monday'],
        safetyRoles: [],
        canStartDrills: false,
        canResolveIncidents: false,
        canManageUsers: false,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      },
    ];

    mockUpsertCertificateForTrainingPass.mockReset();

    render(
      <ComplianceCheckForm
        preselectedCheck={{
          ...trainingCheck,
          trainingDetails: {
            ...trainingCheck.trainingDetails,
            participantId: 'participant-user-2',
            participantName: 'Name In Check Record',
          },
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Complete Check' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm And Complete' }));

    expect(mockUpsertCertificateForTrainingPass).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'perm-2',
        userName: 'Alex Brown',
        email: 'alex@example.com',
      }),
    );
  });
});
