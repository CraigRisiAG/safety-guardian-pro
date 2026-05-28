import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HealthOfficialsCoverageSettings } from '@/components/admin/HealthOfficialsCoverageSettings';
import { CustomBuilding, UserPermission, WorkDay } from '@/types/admin';

const buildings: CustomBuilding[] = [
  {
    id: 'building-1',
    name: 'HQ',
    floors: [
      {
        id: 'floor-1',
        buildingId: 'building-1',
        name: 'Level 1',
        level: 1,
        areas: [
          {
            id: 'area-1',
            floorId: 'floor-1',
            name: 'Reception',
          },
        ],
      },
    ],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
];

const permissions: UserPermission[] = [
  {
    id: 'perm-1',
    userId: 'user-1',
    userName: 'Jordan Field',
    email: 'jordan@example.com',
    role: 'admin',
    buildingAccess: ['building-1'],
    primaryAreaId: 'area-1',
    workDays: ['monday', 'tuesday'],
    safetyRoles: ['health_safety_officer'],
    contactDetails: {
      phone: '0200-111-222',
      mobile: '0700-333-444',
    },
    canStartDrills: true,
    canResolveIncidents: true,
    canManageUsers: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    id: 'perm-1b',
    userId: 'user-1b',
    userName: 'Morgan Warden',
    email: 'morgan@example.com',
    role: 'responder',
    buildingAccess: ['building-1'],
    workDays: ['monday', 'wednesday'],
    safetyRoles: ['evacuation_warden'],
    canStartDrills: true,
    canResolveIncidents: true,
    canManageUsers: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    id: 'perm-2',
    userId: 'user-2',
    userName: 'Alex Viewer',
    email: 'alex@example.com',
    role: 'viewer',
    buildingAccess: ['building-1'],
    workDays: ['monday'],
    safetyRoles: [],
    canStartDrills: false,
    canResolveIncidents: false,
    canManageUsers: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
];

describe('HealthOfficialsCoverageSettings', () => {
  it('toggles required days in coverage tab', () => {
    const onChange = vi.fn();
    const requiredDays: WorkDay[] = ['monday'];

    render(
      <HealthOfficialsCoverageSettings
        requiredDays={requiredDays}
        onChange={onChange}
        permissions={permissions}
        buildings={buildings}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tue' }));
    expect(onChange).toHaveBeenCalledWith(['monday', 'tuesday']);
  });

  it('shows safety officials contact list with area and contact details on second tab', () => {
    render(
      <HealthOfficialsCoverageSettings
        requiredDays={['monday']}
        onChange={vi.fn()}
        permissions={permissions}
        buildings={buildings}
      />,
    );

    const officialsTab = screen.getByRole('tab', { name: /Officials Contact List/i });
    fireEvent.mouseDown(officialsTab, { button: 0, ctrlKey: false });
    expect(officialsTab).toHaveAttribute('aria-selected', 'true');

    expect(screen.getByText('Jordan Field')).toBeInTheDocument();
    expect(screen.getByText('Morgan Warden')).toBeInTheDocument();
    expect(screen.getByText('jordan@example.com')).toBeInTheDocument();
    expect(screen.getByText('HQ - Level 1 / Reception')).toBeInTheDocument();
    expect(screen.getByText('0200-111-222 / 0700-333-444')).toBeInTheDocument();
    expect(screen.queryByText('Alex Viewer')).not.toBeInTheDocument();
  });
});
