import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_NOTIFICATION_DELIVERY_CONFIG,
  DEFAULT_NOTIFICATION_PROVIDER_SETTINGS,
  NOTIFICATION_DELIVERY_CONFIG_KEY,
  NOTIFICATION_PROVIDER_SETTINGS_KEY,
  NOTIFICATIONS_STORAGE_KEY,
  loadNotificationsFromStorage,
  loadNotificationDeliveryConfig,
  loadNotificationProviderSettings,
  notifyComplianceChecksAssigned,
  notifyDrillStarted,
  notifyIncidentReported,
  saveNotificationDeliveryConfig,
  clearNotifications,
  saveNotificationProviderSettings,
} from '@/lib/notifications';
import { CustomBuilding, UserPermission } from '@/types/admin';
import { Drill, Incident } from '@/types/safety';

const buildings: CustomBuilding[] = [
  {
    id: 'building-1',
    name: 'HQ',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    floors: [
      {
        id: 'floor-1',
        buildingId: 'building-1',
        name: 'Floor 1',
        level: 1,
        areas: [
          { id: 'area-1', floorId: 'floor-1', name: 'Area 1' },
          { id: 'area-2', floorId: 'floor-1', name: 'Area 2' },
        ],
      },
    ],
  },
];

const users: UserPermission[] = [
  {
    id: 'perm-1',
    userId: 'user-1',
    userName: 'Area User',
    email: 'area.user@safeguard.local',
    role: 'reporter',
    buildingAccess: ['building-1'],
    primaryFloorId: 'floor-1',
    primaryAreaId: 'area-1',
    workDays: ['monday'],
    safetyRoles: [],
    canStartDrills: false,
    canResolveIncidents: false,
    canManageUsers: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    id: 'perm-2',
    userId: 'user-2',
    userName: 'Responder',
    email: 'responder@safeguard.local',
    role: 'responder',
    buildingAccess: ['building-1'],
    primaryFloorId: 'floor-1',
    primaryAreaId: 'area-2',
    workDays: ['monday'],
    safetyRoles: ['first_aider'],
    contactDetails: {
      mobile: '+1234567890',
    },
    canStartDrills: true,
    canResolveIncidents: true,
    canManageUsers: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    id: 'perm-3',
    userId: 'user-3',
    userName: 'Duplicate Email',
    email: 'responder@safeguard.local',
    role: 'viewer',
    buildingAccess: ['building-1'],
    primaryFloorId: 'floor-1',
    primaryAreaId: 'area-2',
    workDays: ['monday'],
    safetyRoles: [],
    canStartDrills: false,
    canResolveIncidents: false,
    canManageUsers: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
];

const drill: Drill = {
  id: 'drill-1',
  type: 'fire',
  status: 'active',
  location: {
    buildingId: 'building-1',
    buildingIds: ['building-1'],
    floorIds: ['floor-1'],
    areaIds: ['area-1'],
  },
  startedAt: new Date('2026-05-25T09:00:00.000Z'),
  initiatedBy: 'System Admin',
};

const incident: Incident = {
  id: 'incident-1',
  title: 'Blocked emergency exit',
  description: 'Exit obstructed by boxes',
  severity: 'high',
  status: 'open',
  location: {
    buildingId: 'building-1',
    floorId: 'floor-1',
    areaId: 'area-1',
  },
  reportedBy: 'System Admin',
  reportedAt: new Date('2026-05-25T09:05:00.000Z'),
  statusDates: {
    openAt: new Date('2026-05-25T09:05:00.000Z'),
  },
};

describe('notifications', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('notifies all unique users when a drill starts', () => {
    const summary = notifyDrillStarted({
      drill,
      userPermissions: users,
    });

    expect(summary.total).toBe(2);
    expect(summary.sent).toBe(2);
    expect(summary.skipped).toBe(0);

    const records = loadNotificationsFromStorage();
    expect(records).toHaveLength(2);
    expect(records.every((entry) => entry.type === 'drill_started')).toBe(true);
  });

  it('notifies scoped area users and responders when an incident is reported', () => {
    const summary = notifyIncidentReported({
      incident,
      userPermissions: users,
      buildings,
    });

    expect(summary.total).toBe(2);
    expect(summary.sent).toBe(2);

    const records = loadNotificationsFromStorage();
    const recipients = records.map((entry) => entry.recipientUserId).sort();
    expect(recipients).toEqual(['user-1', 'user-2']);
    expect(records.every((entry) => entry.type === 'incident_reported')).toBe(true);
  });

  it('queues email and sms when providers are enabled and skips missing channels', () => {
    localStorage.setItem(
      NOTIFICATION_DELIVERY_CONFIG_KEY,
      JSON.stringify({
        emailEnabled: true,
        smsEnabled: true,
        drillChannels: ['in_app', 'email', 'sms'],
        incidentChannels: ['in_app'],
      }),
    );

    const summary = notifyDrillStarted({
      drill,
      userPermissions: users,
    });

    expect(summary.total).toBe(6);
    expect(summary.sent).toBe(2);
    expect(summary.queued).toBe(3);
    expect(summary.skipped).toBe(1);

    const records = loadNotificationsFromStorage();
    expect(records.filter((entry) => entry.channel === 'email' && entry.status === 'queued')).toHaveLength(2);
    expect(records.filter((entry) => entry.channel === 'sms' && entry.status === 'queued')).toHaveLength(1);
    expect(records.filter((entry) => entry.channel === 'sms' && entry.status === 'skipped')).toHaveLength(1);
  });

  it('persists notifications to localStorage', () => {
    notifyIncidentReported({
      incident,
      userPermissions: users,
      buildings,
    });

    const snapshot = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    expect(snapshot).not.toBeNull();
  });

  it('notifies assigned users when assignment IDs use auth userId values', () => {
    const summary = notifyComplianceChecksAssigned({
      assignedChecks: [
        {
          checkId: 'check-1',
          checkName: 'Training: Area User - First Aid (Level 1)',
          dueAt: new Date('2026-06-01T09:00:00.000Z'),
          assignedUserIds: ['user-1'],
          buildingIds: [],
          areaIds: [],
        },
      ],
      userPermissions: users,
    });

    expect(summary.total).toBe(1);
    expect(summary.sent).toBe(1);

    const records = loadNotificationsFromStorage();
    expect(records).toHaveLength(1);
    expect(records[0].type).toBe('compliance_assigned');
    expect(records[0].recipientUserId).toBe('user-1');
  });

  it('loads default notification delivery config when storage is empty', () => {
    const config = loadNotificationDeliveryConfig();
    expect(config).toEqual(DEFAULT_NOTIFICATION_DELIVERY_CONFIG);
  });

  it('saves and normalizes notification delivery config', () => {
    saveNotificationDeliveryConfig({
      emailEnabled: true,
      smsEnabled: false,
      drillChannels: ['email'],
      incidentChannels: ['sms'],
    });

    const config = loadNotificationDeliveryConfig();
    expect(config.emailEnabled).toBe(true);
    expect(config.smsEnabled).toBe(false);
    expect(config.drillChannels).toEqual(['in_app', 'email']);
    expect(config.incidentChannels).toEqual(['in_app', 'sms']);
    expect(localStorage.getItem(NOTIFICATION_DELIVERY_CONFIG_KEY)).not.toBeNull();
  });

  it('clears notifications from storage', () => {
    notifyDrillStarted({
      drill,
      userPermissions: users,
    });

    expect(loadNotificationsFromStorage().length).toBeGreaterThan(0);

    clearNotifications();

    expect(loadNotificationsFromStorage()).toEqual([]);
  });

  it('loads default provider settings when storage is empty', () => {
    expect(loadNotificationProviderSettings()).toEqual(DEFAULT_NOTIFICATION_PROVIDER_SETTINGS);
  });

  it('saves and loads provider settings with normalization', () => {
    saveNotificationProviderSettings({
      email: {
        enabled: true,
        host: ' smtp.mail.com ',
        port: 2525,
        secure: true,
        username: ' user ',
        password: ' pass ',
        fromAddress: ' alerts@mail.com ',
        fromName: ' Safety Alerts ',
      },
      sms: {
        enabled: true,
        provider: 'custom',
        apiBaseUrl: ' https://sms.api ',
        accountId: ' id ',
        authToken: ' token ',
        fromNumber: ' +15551234567 ',
      },
      teams: {
        enabled: true,
        webhookUrl: ' https://teams.webhook ',
      },
      whatsapp: {
        enabled: true,
        apiBaseUrl: ' https://wa.api ',
        accessToken: ' wa-token ',
        phoneNumberId: ' 12345 ',
      },
      slack: {
        enabled: true,
        webhookUrl: ' https://slack.webhook ',
        botToken: ' xoxb-123 ',
        channel: ' #safety ',
      },
    });

    const settings = loadNotificationProviderSettings();
    expect(settings.email.host).toBe('smtp.mail.com');
    expect(settings.email.username).toBe('user');
    expect(settings.sms.apiBaseUrl).toBe('https://sms.api');
    expect(settings.teams.webhookUrl).toBe('https://teams.webhook');
    expect(settings.whatsapp.phoneNumberId).toBe('12345');
    expect(settings.slack.channel).toBe('#safety');
    expect(localStorage.getItem(NOTIFICATION_PROVIDER_SETTINGS_KEY)).not.toBeNull();
  });
});
