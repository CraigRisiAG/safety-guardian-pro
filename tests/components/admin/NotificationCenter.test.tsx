import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationCenter } from '@/components/admin/NotificationCenter';

const mockLoadNotificationsFromStorage = vi.fn();
const mockClearNotifications = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock('@/lib/notifications', () => ({
  NOTIFICATIONS_UPDATED_EVENT: 'safeguard_notifications_updated',
  loadNotificationsFromStorage: () => mockLoadNotificationsFromStorage(),
  clearNotifications: () => mockClearNotifications(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

describe('NotificationCenter', () => {
  beforeEach(() => {
    mockClearNotifications.mockReset();
    mockToastSuccess.mockReset();
  });

  it('renders notification summary from records', () => {
    mockLoadNotificationsFromStorage.mockReturnValue([
      {
        id: 'n-1',
        type: 'drill_started',
        channel: 'in_app',
        status: 'sent',
        recipientUserId: 'u-1',
        recipientName: 'User One',
        message: 'Drill started',
        createdAt: new Date('2026-05-25T10:00:00.000Z'),
      },
      {
        id: 'n-2',
        type: 'incident_reported',
        channel: 'email',
        status: 'queued',
        recipientUserId: 'u-2',
        recipientName: 'User Two',
        recipientEmail: 'user.two@safeguard.local',
        message: 'Incident reported',
        createdAt: new Date('2026-05-25T10:05:00.000Z'),
      },
    ]);

    render(<NotificationCenter />);

    expect(screen.getByText('Notification Center')).toBeInTheDocument();
    expect(screen.getByText('Showing 2 of 2 records')).toBeInTheDocument();
    expect(screen.getByText('Drill started')).toBeInTheDocument();
    expect(screen.getByText('Incident reported')).toBeInTheDocument();
  });

  it('clears notifications from center', () => {
    mockLoadNotificationsFromStorage.mockReturnValue([
      {
        id: 'n-1',
        type: 'drill_started',
        channel: 'in_app',
        status: 'sent',
        recipientUserId: 'u-1',
        recipientName: 'User One',
        message: 'Drill started',
        createdAt: new Date('2026-05-25T10:00:00.000Z'),
      },
    ]);

    render(<NotificationCenter />);

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(mockClearNotifications).toHaveBeenCalledTimes(1);
    expect(mockToastSuccess).toHaveBeenCalledWith('Notification center cleared');
  });
});
