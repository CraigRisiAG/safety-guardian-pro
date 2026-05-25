import { getScopedAreaIds } from '@/lib/personnelAccess';
import { UserPermission, CustomBuilding } from '@/types/admin';
import { Drill, Incident } from '@/types/safety';

export const NOTIFICATIONS_STORAGE_KEY = 'safeguard_notifications';
export const NOTIFICATIONS_UPDATED_EVENT = 'safeguard_notifications_updated';
export const NOTIFICATION_DELIVERY_CONFIG_KEY = 'safeguard_notification_delivery_config';
export const NOTIFICATION_PROVIDER_SETTINGS_KEY = 'safeguard_notification_provider_settings';

export type NotificationChannel = 'in_app' | 'email' | 'sms';
export type NotificationType = 'drill_started' | 'incident_reported' | 'compliance_missed';
export type NotificationStatus = 'queued' | 'sent' | 'skipped';

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  recipientUserId: string;
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  message: string;
  areaId?: string;
  buildingId?: string;
  metadata?: Record<string, string | number | boolean | null>;
  deliveryNote?: string;
  createdAt: Date;
  sentAt?: Date;
}

interface RawNotificationRecord extends Omit<NotificationRecord, 'createdAt' | 'sentAt'> {
  createdAt: string;
  sentAt?: string;
}

interface NotificationRecipient {
  userId: string;
  userName: string;
  email: string;
  phone?: string;
}

export interface NotificationDeliveryConfig {
  emailEnabled: boolean;
  smsEnabled: boolean;
  drillChannels: NotificationChannel[];
  incidentChannels: NotificationChannel[];
}

export interface NotificationDispatchSummary {
  total: number;
  sent: number;
  queued: number;
  skipped: number;
}

export interface EmailProviderSettings {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromAddress: string;
  fromName: string;
}

export interface SmsProviderSettings {
  enabled: boolean;
  provider: 'twilio' | 'vonage' | 'custom';
  apiBaseUrl: string;
  accountId: string;
  authToken: string;
  fromNumber: string;
}

export interface TeamsIntegrationSettings {
  enabled: boolean;
  webhookUrl: string;
}

export interface WhatsAppIntegrationSettings {
  enabled: boolean;
  apiBaseUrl: string;
  accessToken: string;
  phoneNumberId: string;
}

export interface SlackIntegrationSettings {
  enabled: boolean;
  webhookUrl: string;
  botToken: string;
  channel: string;
}

export interface NotificationProviderSettings {
  email: EmailProviderSettings;
  sms: SmsProviderSettings;
  teams: TeamsIntegrationSettings;
  whatsapp: WhatsAppIntegrationSettings;
  slack: SlackIntegrationSettings;
}

export const DEFAULT_NOTIFICATION_DELIVERY_CONFIG: NotificationDeliveryConfig = {
  emailEnabled: false,
  smsEnabled: false,
  drillChannels: ['in_app'],
  incidentChannels: ['in_app'],
};

export const DEFAULT_NOTIFICATION_PROVIDER_SETTINGS: NotificationProviderSettings = {
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
  teams: {
    enabled: false,
    webhookUrl: '',
  },
  whatsapp: {
    enabled: false,
    apiBaseUrl: '',
    accessToken: '',
    phoneNumberId: '',
  },
  slack: {
    enabled: false,
    webhookUrl: '',
    botToken: '',
    channel: '',
  },
};

const readStorage = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // no-op
  }
};

const parseNotificationRecords = (raw: string | null): NotificationRecord[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as RawNotificationRecord[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry) => !!entry?.id && !!entry?.type && !!entry?.channel)
      .map((entry) => ({
        ...entry,
        createdAt: new Date(entry.createdAt),
        sentAt: entry.sentAt ? new Date(entry.sentAt) : undefined,
      }));
  } catch {
    return [];
  }
};

const toRawNotificationRecord = (entry: NotificationRecord): RawNotificationRecord => ({
  ...entry,
  createdAt: entry.createdAt.toISOString(),
  sentAt: entry.sentAt?.toISOString(),
});

const parseChannels = (value: unknown): NotificationChannel[] => {
  if (!Array.isArray(value)) {
    return ['in_app'];
  }

  const channels = value.filter((entry): entry is NotificationChannel =>
    entry === 'in_app' || entry === 'email' || entry === 'sms',
  );

  if (channels.length === 0) {
    return ['in_app'];
  }

  if (!channels.includes('in_app')) {
    channels.unshift('in_app');
  }

  return Array.from(new Set(channels));
};

const sanitizeText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const sanitizeProvider = (value: unknown): SmsProviderSettings['provider'] => {
  return value === 'vonage' || value === 'custom' ? value : 'twilio';
};

export const loadNotificationDeliveryConfig = (): NotificationDeliveryConfig => {
  const raw = readStorage(NOTIFICATION_DELIVERY_CONFIG_KEY);
  if (!raw) {
    return DEFAULT_NOTIFICATION_DELIVERY_CONFIG;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<NotificationDeliveryConfig>;
    return {
      emailEnabled: !!parsed.emailEnabled,
      smsEnabled: !!parsed.smsEnabled,
      drillChannels: parseChannels(parsed.drillChannels),
      incidentChannels: parseChannels(parsed.incidentChannels),
    };
  } catch {
    return DEFAULT_NOTIFICATION_DELIVERY_CONFIG;
  }
};

export const loadNotificationProviderSettings = (): NotificationProviderSettings => {
  const raw = readStorage(NOTIFICATION_PROVIDER_SETTINGS_KEY);
  if (!raw) {
    return DEFAULT_NOTIFICATION_PROVIDER_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<NotificationProviderSettings>;
    return {
      email: {
        enabled: !!parsed.email?.enabled,
        host: sanitizeText(parsed.email?.host),
        port: Number.isFinite(Number(parsed.email?.port)) ? Number(parsed.email?.port) : 587,
        secure: !!parsed.email?.secure,
        username: sanitizeText(parsed.email?.username),
        password: sanitizeText(parsed.email?.password),
        fromAddress: sanitizeText(parsed.email?.fromAddress),
        fromName: sanitizeText(parsed.email?.fromName),
      },
      sms: {
        enabled: !!parsed.sms?.enabled,
        provider: sanitizeProvider(parsed.sms?.provider),
        apiBaseUrl: sanitizeText(parsed.sms?.apiBaseUrl),
        accountId: sanitizeText(parsed.sms?.accountId),
        authToken: sanitizeText(parsed.sms?.authToken),
        fromNumber: sanitizeText(parsed.sms?.fromNumber),
      },
      teams: {
        enabled: !!parsed.teams?.enabled,
        webhookUrl: sanitizeText(parsed.teams?.webhookUrl),
      },
      whatsapp: {
        enabled: !!parsed.whatsapp?.enabled,
        apiBaseUrl: sanitizeText(parsed.whatsapp?.apiBaseUrl),
        accessToken: sanitizeText(parsed.whatsapp?.accessToken),
        phoneNumberId: sanitizeText(parsed.whatsapp?.phoneNumberId),
      },
      slack: {
        enabled: !!parsed.slack?.enabled,
        webhookUrl: sanitizeText(parsed.slack?.webhookUrl),
        botToken: sanitizeText(parsed.slack?.botToken),
        channel: sanitizeText(parsed.slack?.channel),
      },
    };
  } catch {
    return DEFAULT_NOTIFICATION_PROVIDER_SETTINGS;
  }
};

export const saveNotificationDeliveryConfig = (config: NotificationDeliveryConfig) => {
  const normalized: NotificationDeliveryConfig = {
    emailEnabled: !!config.emailEnabled,
    smsEnabled: !!config.smsEnabled,
    drillChannels: parseChannels(config.drillChannels),
    incidentChannels: parseChannels(config.incidentChannels),
  };

  writeStorage(NOTIFICATION_DELIVERY_CONFIG_KEY, JSON.stringify(normalized));
};

export const saveNotificationProviderSettings = (settings: NotificationProviderSettings) => {
  const normalized: NotificationProviderSettings = {
    email: {
      enabled: !!settings.email.enabled,
      host: sanitizeText(settings.email.host),
      port: Number.isFinite(Number(settings.email.port)) ? Number(settings.email.port) : 587,
      secure: !!settings.email.secure,
      username: sanitizeText(settings.email.username),
      password: sanitizeText(settings.email.password),
      fromAddress: sanitizeText(settings.email.fromAddress),
      fromName: sanitizeText(settings.email.fromName),
    },
    sms: {
      enabled: !!settings.sms.enabled,
      provider: sanitizeProvider(settings.sms.provider),
      apiBaseUrl: sanitizeText(settings.sms.apiBaseUrl),
      accountId: sanitizeText(settings.sms.accountId),
      authToken: sanitizeText(settings.sms.authToken),
      fromNumber: sanitizeText(settings.sms.fromNumber),
    },
    teams: {
      enabled: !!settings.teams.enabled,
      webhookUrl: sanitizeText(settings.teams.webhookUrl),
    },
    whatsapp: {
      enabled: !!settings.whatsapp.enabled,
      apiBaseUrl: sanitizeText(settings.whatsapp.apiBaseUrl),
      accessToken: sanitizeText(settings.whatsapp.accessToken),
      phoneNumberId: sanitizeText(settings.whatsapp.phoneNumberId),
    },
    slack: {
      enabled: !!settings.slack.enabled,
      webhookUrl: sanitizeText(settings.slack.webhookUrl),
      botToken: sanitizeText(settings.slack.botToken),
      channel: sanitizeText(settings.slack.channel),
    },
  };

  writeStorage(NOTIFICATION_PROVIDER_SETTINGS_KEY, JSON.stringify(normalized));
};

export const loadNotificationsFromStorage = (): NotificationRecord[] => {
  return parseNotificationRecords(readStorage(NOTIFICATIONS_STORAGE_KEY)).sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  );
};

export const clearNotifications = () => {
  persistNotifications([]);
};

const persistNotifications = (entries: NotificationRecord[]) => {
  writeStorage(
    NOTIFICATIONS_STORAGE_KEY,
    JSON.stringify(entries.map((entry) => toRawNotificationRecord(entry))),
  );
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
};

const uniqueRecipients = (entries: NotificationRecipient[]): NotificationRecipient[] => {
  const seen = new Set<string>();

  return entries.filter((entry) => {
    const key = (entry.email || entry.userId).trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const toNotificationRecipients = (permissions: UserPermission[]): NotificationRecipient[] => {
  return permissions
    .filter((entry) => !!entry.email)
    .map((entry) => ({
      userId: entry.userId || entry.id,
      userName: entry.userName,
      email: entry.email,
      phone: entry.contactDetails?.mobile || entry.contactDetails?.phone,
    }));
};

const resolveDrillRecipients = (permissions: UserPermission[]): NotificationRecipient[] => {
  return uniqueRecipients(toNotificationRecipients(permissions));
};

const resolveIncidentRecipients = (
  areaId: string,
  buildingId: string,
  permissions: UserPermission[],
  buildings: CustomBuilding[],
): NotificationRecipient[] => {
  const recipients = permissions.filter((entry) => {
    if (entry.primaryAreaId === areaId) {
      return true;
    }

    if (!entry.canResolveIncidents) {
      return false;
    }

    if (entry.buildingAccess.includes(buildingId)) {
      return true;
    }

    const scopedAreaIds = getScopedAreaIds(entry, buildings);
    return scopedAreaIds.includes(areaId);
  });

  return uniqueRecipients(toNotificationRecipients(recipients));
};

const makeRecord = (input: {
  type: NotificationType;
  channel: NotificationChannel;
  recipient: NotificationRecipient;
  message: string;
  areaId?: string;
  buildingId?: string;
  metadata?: Record<string, string | number | boolean | null>;
  delivery: { status: NotificationStatus; note?: string };
}): NotificationRecord => {
  const now = new Date();

  return {
    id: `notification-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: input.type,
    channel: input.channel,
    status: input.delivery.status,
    recipientUserId: input.recipient.userId,
    recipientName: input.recipient.userName,
    recipientEmail: input.recipient.email,
    recipientPhone: input.recipient.phone,
    message: input.message,
    areaId: input.areaId,
    buildingId: input.buildingId,
    metadata: input.metadata,
    deliveryNote: input.delivery.note,
    createdAt: now,
    sentAt: input.delivery.status === 'sent' ? now : undefined,
  };
};

const evaluateDelivery = (
  channel: NotificationChannel,
  recipient: NotificationRecipient,
  config: NotificationDeliveryConfig,
): { status: NotificationStatus; note?: string } => {
  if (channel === 'in_app') {
    return { status: 'sent' };
  }

  if (channel === 'email') {
    if (!config.emailEnabled) {
      return { status: 'skipped', note: 'Email provider is not configured yet' };
    }

    if (!recipient.email) {
      return { status: 'skipped', note: 'Recipient does not have an email address' };
    }

    return { status: 'queued' };
  }

  if (!config.smsEnabled) {
    return { status: 'skipped', note: 'SMS provider is not configured yet' };
  }

  if (!recipient.phone) {
    return { status: 'skipped', note: 'Recipient does not have a phone number' };
  }

  return { status: 'queued' };
};

const dispatchNotifications = (input: {
  type: NotificationType;
  message: string;
  recipients: NotificationRecipient[];
  channels: NotificationChannel[];
  areaId?: string;
  buildingId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}): NotificationDispatchSummary => {
  const config = loadNotificationDeliveryConfig();
  const existing = loadNotificationsFromStorage();
  const records: NotificationRecord[] = [];

  for (const recipient of input.recipients) {
    for (const channel of input.channels) {
      const delivery = evaluateDelivery(channel, recipient, config);
      records.push(
        makeRecord({
          type: input.type,
          channel,
          recipient,
          message: input.message,
          areaId: input.areaId,
          buildingId: input.buildingId,
          metadata: input.metadata,
          delivery,
        }),
      );
    }
  }

  if (records.length > 0) {
    persistNotifications([...records, ...existing]);
  }

  return {
    total: records.length,
    sent: records.filter((entry) => entry.status === 'sent').length,
    queued: records.filter((entry) => entry.status === 'queued').length,
    skipped: records.filter((entry) => entry.status === 'skipped').length,
  };
};

export const notifyDrillStarted = (input: {
  drill: Drill;
  userPermissions: UserPermission[];
}): NotificationDispatchSummary => {
  const recipients = resolveDrillRecipients(input.userPermissions);
  const config = loadNotificationDeliveryConfig();

  return dispatchNotifications({
    type: 'drill_started',
    message: `Emergency drill started (${input.drill.type})`,
    recipients,
    channels: config.drillChannels,
    buildingId: input.drill.location.buildingId,
    metadata: {
      drillId: input.drill.id,
      drillType: input.drill.type,
    },
  });
};

export const notifyIncidentReported = (input: {
  incident: Incident;
  userPermissions: UserPermission[];
  buildings: CustomBuilding[];
}): NotificationDispatchSummary => {
  const recipients = resolveIncidentRecipients(
    input.incident.location.areaId,
    input.incident.location.buildingId,
    input.userPermissions,
    input.buildings,
  );
  const config = loadNotificationDeliveryConfig();

  return dispatchNotifications({
    type: 'incident_reported',
    message: `New ${input.incident.severity} incident reported: ${input.incident.title}`,
    recipients,
    channels: config.incidentChannels,
    buildingId: input.incident.location.buildingId,
    areaId: input.incident.location.areaId,
    metadata: {
      incidentId: input.incident.id,
      severity: input.incident.severity,
    },
  });
};

interface MissedComplianceNotificationInput {
  checkId: string;
  checkName: string;
  dueAt: Date;
  assignedUserIds: string[];
  areaIds?: string[];
  buildingIds?: string[];
}

export const notifyComplianceChecksMissed = (input: {
  missedChecks: MissedComplianceNotificationInput[];
  userPermissions: UserPermission[];
}): NotificationDispatchSummary => {
  const config = loadNotificationDeliveryConfig();
  let aggregate: NotificationDispatchSummary = {
    total: 0,
    sent: 0,
    queued: 0,
    skipped: 0,
  };

  input.missedChecks.forEach((missedCheck) => {
    const recipients = uniqueRecipients(
      toNotificationRecipients(
        input.userPermissions.filter((entry) => missedCheck.assignedUserIds.includes(entry.id)),
      ),
    );

    if (recipients.length === 0) {
      return;
    }

    const summary = dispatchNotifications({
      type: 'compliance_missed',
      message: `Compliance check missed: ${missedCheck.checkName} (due ${missedCheck.dueAt.toLocaleDateString()})`,
      recipients,
      channels: config.incidentChannels,
      buildingId: missedCheck.buildingIds?.[0],
      areaId: missedCheck.areaIds?.[0],
      metadata: {
        checkId: missedCheck.checkId,
        dueAt: missedCheck.dueAt.toISOString(),
      },
    });

    aggregate = {
      total: aggregate.total + summary.total,
      sent: aggregate.sent + summary.sent,
      queued: aggregate.queued + summary.queued,
      skipped: aggregate.skipped + summary.skipped,
    };
  });

  return aggregate;
};
