import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationIntegrationPortal } from '@/components/admin/NotificationIntegrationPortal';

const mockLoadProviderSettings = vi.fn();
const mockSaveProviderSettings = vi.fn();
const mockLoadDeliveryConfig = vi.fn();
const mockSaveDeliveryConfig = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/lib/notifications', () => ({
  DEFAULT_NOTIFICATION_PROVIDER_SETTINGS: {
    email: {
      enabled: false,
      host: '',
      port: 587,
      secure: false,
      username: '',
      password: '',
      fromAddress: '',
      fromName: '',
    },
    sms: {
      enabled: false,
      provider: 'twilio',
      apiBaseUrl: '',
      accountId: '',
      authToken: '',
      fromNumber: '',
    },
    teams: { enabled: false, webhookUrl: '' },
    whatsapp: { enabled: false, apiBaseUrl: '', accessToken: '', phoneNumberId: '' },
    slack: { enabled: false, webhookUrl: '', botToken: '', channel: '' },
  },
  loadNotificationProviderSettings: () => mockLoadProviderSettings(),
  saveNotificationProviderSettings: (...args: unknown[]) => mockSaveProviderSettings(...args),
  loadNotificationDeliveryConfig: () => mockLoadDeliveryConfig(),
  saveNotificationDeliveryConfig: (...args: unknown[]) => mockSaveDeliveryConfig(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

describe('NotificationIntegrationPortal', () => {
  beforeEach(() => {
    mockSaveProviderSettings.mockReset();
    mockSaveDeliveryConfig.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();

    mockLoadDeliveryConfig.mockReturnValue({
      emailEnabled: false,
      smsEnabled: false,
      drillChannels: ['in_app'],
      incidentChannels: ['in_app'],
    });
  });

  it('saves provider settings and syncs email/sms delivery toggles', () => {
    mockLoadProviderSettings.mockReturnValue({
      email: {
        enabled: true,
        host: 'smtp.company.com',
        port: 587,
        secure: false,
        username: 'smtp-user',
        password: 'secret',
        fromAddress: 'alerts@company.com',
        fromName: 'Alerts',
      },
      sms: {
        enabled: false,
        provider: 'twilio',
        apiBaseUrl: 'https://api.twilio.com',
        accountId: 'AC123',
        authToken: 'token',
        fromNumber: '+15551234567',
      },
      teams: { enabled: false, webhookUrl: '' },
      whatsapp: { enabled: false, apiBaseUrl: '', accessToken: '', phoneNumberId: '' },
      slack: { enabled: false, webhookUrl: '', botToken: '', channel: '' },
    });

    render(<NotificationIntegrationPortal />);

    fireEvent.click(screen.getByRole('button', { name: 'Save Integration Settings' }));

    expect(mockSaveProviderSettings).toHaveBeenCalledTimes(1);
    expect(mockSaveDeliveryConfig).toHaveBeenCalledWith({
      emailEnabled: true,
      smsEnabled: false,
      drillChannels: ['in_app'],
      incidentChannels: ['in_app'],
    });
    expect(mockToastSuccess).toHaveBeenCalledWith('Notification integration settings saved');
  });

  it('shows error when testing email while disabled', () => {
    mockLoadProviderSettings.mockReturnValue({
      email: {
        enabled: false,
        host: '',
        port: 587,
        secure: false,
        username: '',
        password: '',
        fromAddress: '',
        fromName: '',
      },
      sms: {
        enabled: false,
        provider: 'twilio',
        apiBaseUrl: '',
        accountId: '',
        authToken: '',
        fromNumber: '',
      },
      teams: { enabled: false, webhookUrl: '' },
      whatsapp: { enabled: false, apiBaseUrl: '', accessToken: '', phoneNumberId: '' },
      slack: { enabled: false, webhookUrl: '', botToken: '', channel: '' },
    });

    render(<NotificationIntegrationPortal />);
    fireEvent.click(screen.getByRole('button', { name: 'Test Email Connection' }));

    expect(mockToastError).toHaveBeenCalledWith('Enable Email before testing.');
  });

  it('shows success for a valid email connection test', () => {
    mockLoadProviderSettings.mockReturnValue({
      email: {
        enabled: true,
        host: 'smtp.company.com',
        port: 587,
        secure: true,
        username: 'smtp-user',
        password: 'secret',
        fromAddress: 'alerts@company.com',
        fromName: 'Alerts',
      },
      sms: {
        enabled: false,
        provider: 'twilio',
        apiBaseUrl: '',
        accountId: '',
        authToken: '',
        fromNumber: '',
      },
      teams: { enabled: false, webhookUrl: '' },
      whatsapp: { enabled: false, apiBaseUrl: '', accessToken: '', phoneNumberId: '' },
      slack: { enabled: false, webhookUrl: '', botToken: '', channel: '' },
    });

    render(<NotificationIntegrationPortal />);
    fireEvent.click(screen.getByRole('button', { name: 'Test Email Connection' }));

    expect(mockToastSuccess).toHaveBeenCalledWith('Email connection test passed (simulated).');
  });
});
