import { useEffect, useState } from 'react';
import { BellRing, Mail, MessageSquareText, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DEFAULT_NOTIFICATION_PROVIDER_SETTINGS,
  NotificationProviderSettings,
  loadNotificationDeliveryConfig,
  loadNotificationProviderSettings,
  saveNotificationDeliveryConfig,
  saveNotificationProviderSettings,
} from '@/lib/notifications';
import { toast } from 'sonner';

interface TestFeedback {
  ok: boolean;
  message: string;
}

const looksLikeUrl = (value: string) => /^https?:\/\//i.test(value.trim());
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const looksLikePhone = (value: string) => /^\+?[0-9\-\s()]{7,}$/.test(value.trim());

const toFeedback = (ok: boolean, message: string): TestFeedback => ({ ok, message });

export function NotificationIntegrationPortal() {
  const [settings, setSettings] = useState<NotificationProviderSettings>(
    DEFAULT_NOTIFICATION_PROVIDER_SETTINGS,
  );
  const [testFeedback, setTestFeedback] = useState<Record<string, TestFeedback | undefined>>({});

  useEffect(() => {
    setSettings(loadNotificationProviderSettings());
  }, []);

  const saveAll = () => {
    saveNotificationProviderSettings(settings);

    const delivery = loadNotificationDeliveryConfig();
    saveNotificationDeliveryConfig({
      ...delivery,
      emailEnabled: settings.email.enabled,
      smsEnabled: settings.sms.enabled,
    });

    toast.success('Notification integration settings saved');
  };

  const setProviderFeedback = (provider: string, feedback: TestFeedback) => {
    setTestFeedback((prev) => ({ ...prev, [provider]: feedback }));
    if (feedback.ok) {
      toast.success(feedback.message);
    } else {
      toast.error(feedback.message);
    }
  };

  const testEmailConnection = () => {
    const email = settings.email;
    if (!email.enabled) {
      setProviderFeedback('email', toFeedback(false, 'Enable Email before testing.'));
      return;
    }
    if (!email.host || !email.port || !email.username || !email.password || !email.fromAddress) {
      setProviderFeedback('email', toFeedback(false, 'Email test failed: missing host, port, credentials, or from address.'));
      return;
    }
    if (!looksLikeEmail(email.fromAddress)) {
      setProviderFeedback('email', toFeedback(false, 'Email test failed: from address is not valid.'));
      return;
    }
    setProviderFeedback('email', toFeedback(true, 'Email connection test passed (simulated).'));
  };

  const testSmsConnection = () => {
    const sms = settings.sms;
    if (!sms.enabled) {
      setProviderFeedback('sms', toFeedback(false, 'Enable SMS before testing.'));
      return;
    }
    if (!sms.apiBaseUrl || !sms.accountId || !sms.authToken || !sms.fromNumber) {
      setProviderFeedback('sms', toFeedback(false, 'SMS test failed: missing API URL, account, token, or from number.'));
      return;
    }
    if (!looksLikeUrl(sms.apiBaseUrl)) {
      setProviderFeedback('sms', toFeedback(false, 'SMS test failed: API URL must start with http:// or https://.'));
      return;
    }
    if (!looksLikePhone(sms.fromNumber)) {
      setProviderFeedback('sms', toFeedback(false, 'SMS test failed: from number format is invalid.'));
      return;
    }
    setProviderFeedback('sms', toFeedback(true, `SMS connection test passed for ${sms.provider} (simulated).`));
  };

  const testTeamsConnection = () => {
    const teams = settings.teams;
    if (!teams.enabled) {
      setProviderFeedback('teams', toFeedback(false, 'Enable Microsoft Teams before testing.'));
      return;
    }
    if (!teams.webhookUrl || !looksLikeUrl(teams.webhookUrl)) {
      setProviderFeedback('teams', toFeedback(false, 'Teams test failed: valid webhook URL is required.'));
      return;
    }
    setProviderFeedback('teams', toFeedback(true, 'Microsoft Teams webhook test passed (simulated).'));
  };

  const testWhatsAppConnection = () => {
    const whatsapp = settings.whatsapp;
    if (!whatsapp.enabled) {
      setProviderFeedback('whatsapp', toFeedback(false, 'Enable WhatsApp before testing.'));
      return;
    }
    if (!whatsapp.apiBaseUrl || !whatsapp.accessToken || !whatsapp.phoneNumberId) {
      setProviderFeedback('whatsapp', toFeedback(false, 'WhatsApp test failed: missing API URL, access token, or phone number ID.'));
      return;
    }
    if (!looksLikeUrl(whatsapp.apiBaseUrl)) {
      setProviderFeedback('whatsapp', toFeedback(false, 'WhatsApp test failed: API URL must start with http:// or https://.'));
      return;
    }
    setProviderFeedback('whatsapp', toFeedback(true, 'WhatsApp API test passed (simulated).'));
  };

  const testSlackConnection = () => {
    const slack = settings.slack;
    if (!slack.enabled) {
      setProviderFeedback('slack', toFeedback(false, 'Enable Slack before testing.'));
      return;
    }
    if (!slack.webhookUrl || !slack.channel) {
      setProviderFeedback('slack', toFeedback(false, 'Slack test failed: webhook URL and channel are required.'));
      return;
    }
    if (!looksLikeUrl(slack.webhookUrl)) {
      setProviderFeedback('slack', toFeedback(false, 'Slack test failed: webhook URL must start with http:// or https://.'));
      return;
    }
    setProviderFeedback('slack', toFeedback(true, 'Slack webhook test passed (simulated).'));
  };

  const resetAll = () => {
    setSettings(DEFAULT_NOTIFICATION_PROVIDER_SETTINGS);
    saveNotificationProviderSettings(DEFAULT_NOTIFICATION_PROVIDER_SETTINGS);

    const delivery = loadNotificationDeliveryConfig();
    saveNotificationDeliveryConfig({
      ...delivery,
      emailEnabled: false,
      smsEnabled: false,
    });

    toast.success('Integration settings reset to defaults');
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="w-5 h-5" />
          Integrations Portal
        </CardTitle>
        <CardDescription>
          Configure technical setup for Email, SMS, Teams, WhatsApp, and Slack. These values are stored locally for now and can be moved to secure cloud secrets when you deploy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold flex items-center gap-2"><Mail className="w-4 h-4" /> Email (SMTP)</h4>
            <Switch
              checked={settings.email.enabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, email: { ...prev.email, enabled: checked } }))
              }
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>SMTP Host</Label>
              <Input
                value={settings.email.host}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, email: { ...prev.email, host: event.target.value } }))
                }
                placeholder="smtp.your-provider.com"
              />
            </div>
            <div className="space-y-2">
              <Label>SMTP Port</Label>
              <Input
                type="number"
                value={settings.email.port}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, email: { ...prev.email, port: Number(event.target.value) || 0 } }))
                }
                placeholder="587"
              />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={settings.email.username}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, email: { ...prev.email, username: event.target.value } }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Password / App Secret</Label>
              <Input
                type="password"
                value={settings.email.password}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, email: { ...prev.email, password: event.target.value } }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>From Address</Label>
              <Input
                value={settings.email.fromAddress}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, email: { ...prev.email, fromAddress: event.target.value } }))
                }
                placeholder="alerts@yourcompany.com"
              />
            </div>
            <div className="space-y-2">
              <Label>From Name</Label>
              <Input
                value={settings.email.fromName}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, email: { ...prev.email, fromName: event.target.value } }))
                }
                placeholder="Safety Guardian Alerts"
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <Label>Use Secure SMTP (TLS/SSL)</Label>
            <Switch
              checked={settings.email.secure}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, email: { ...prev.email, secure: checked } }))
              }
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="outline" onClick={testEmailConnection}>Test Email Connection</Button>
            {testFeedback.email && (
              <p className={`text-xs ${testFeedback.email.ok ? 'text-safe' : 'text-emergency'}`}>
                {testFeedback.email.message}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold flex items-center gap-2"><Smartphone className="w-4 h-4" /> SMS Provider</h4>
            <Switch
              checked={settings.sms.enabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, sms: { ...prev.sms, enabled: checked } }))
              }
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={settings.sms.provider}
                onValueChange={(value: 'twilio' | 'vonage' | 'custom') =>
                  setSettings((prev) => ({ ...prev, sms: { ...prev.sms, provider: value } }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="vonage">Vonage</SelectItem>
                  <SelectItem value="custom">Custom API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>API Base URL</Label>
              <Input
                value={settings.sms.apiBaseUrl}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, sms: { ...prev.sms, apiBaseUrl: event.target.value } }))
                }
                placeholder="https://api.twilio.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Account ID / SID</Label>
              <Input
                value={settings.sms.accountId}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, sms: { ...prev.sms, accountId: event.target.value } }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Auth Token</Label>
              <Input
                type="password"
                value={settings.sms.authToken}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, sms: { ...prev.sms, authToken: event.target.value } }))
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>From Number</Label>
              <Input
                value={settings.sms.fromNumber}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, sms: { ...prev.sms, fromNumber: event.target.value } }))
                }
                placeholder="+15551234567"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="outline" onClick={testSmsConnection}>Test SMS Connection</Button>
            {testFeedback.sms && (
              <p className={`text-xs ${testFeedback.sms.ok ? 'text-safe' : 'text-emergency'}`}>
                {testFeedback.sms.message}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border p-4 space-y-4">
          <h4 className="font-semibold flex items-center gap-2"><MessageSquareText className="w-4 h-4" /> Collaboration Integrations</h4>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-md border border-border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Microsoft Teams</Label>
                <Switch
                  checked={settings.teams.enabled}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, teams: { ...prev.teams, enabled: checked } }))
                  }
                />
              </div>
              <Input
                value={settings.teams.webhookUrl}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, teams: { ...prev.teams, webhookUrl: event.target.value } }))
                }
                placeholder="Incoming webhook URL"
              />
              <Button type="button" variant="outline" className="w-full" onClick={testTeamsConnection}>Test Teams</Button>
              {testFeedback.teams && (
                <p className={`text-xs ${testFeedback.teams.ok ? 'text-safe' : 'text-emergency'}`}>
                  {testFeedback.teams.message}
                </p>
              )}
            </div>

            <div className="rounded-md border border-border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label>WhatsApp</Label>
                <Switch
                  checked={settings.whatsapp.enabled}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, whatsapp: { ...prev.whatsapp, enabled: checked } }))
                  }
                />
              </div>
              <Input
                value={settings.whatsapp.apiBaseUrl}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, whatsapp: { ...prev.whatsapp, apiBaseUrl: event.target.value } }))
                }
                placeholder="WhatsApp API base URL"
              />
              <Input
                type="password"
                value={settings.whatsapp.accessToken}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, whatsapp: { ...prev.whatsapp, accessToken: event.target.value } }))
                }
                placeholder="Access token"
              />
              <Input
                value={settings.whatsapp.phoneNumberId}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, whatsapp: { ...prev.whatsapp, phoneNumberId: event.target.value } }))
                }
                placeholder="Phone number ID"
              />
              <Button type="button" variant="outline" className="w-full" onClick={testWhatsAppConnection}>Test WhatsApp</Button>
              {testFeedback.whatsapp && (
                <p className={`text-xs ${testFeedback.whatsapp.ok ? 'text-safe' : 'text-emergency'}`}>
                  {testFeedback.whatsapp.message}
                </p>
              )}
            </div>

            <div className="rounded-md border border-border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Slack</Label>
                <Switch
                  checked={settings.slack.enabled}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, slack: { ...prev.slack, enabled: checked } }))
                  }
                />
              </div>
              <Input
                value={settings.slack.webhookUrl}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, slack: { ...prev.slack, webhookUrl: event.target.value } }))
                }
                placeholder="Webhook URL"
              />
              <Input
                type="password"
                value={settings.slack.botToken}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, slack: { ...prev.slack, botToken: event.target.value } }))
                }
                placeholder="Bot token"
              />
              <Input
                value={settings.slack.channel}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, slack: { ...prev.slack, channel: event.target.value } }))
                }
                placeholder="#safety-alerts"
              />
              <Button type="button" variant="outline" className="w-full" onClick={testSlackConnection}>Test Slack</Button>
              {testFeedback.slack && (
                <p className={`text-xs ${testFeedback.slack.ok ? 'text-safe' : 'text-emergency'}`}>
                  {testFeedback.slack.message}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <Button type="button" variant="outline" onClick={resetAll}>Reset Portal</Button>
          <Button type="button" onClick={saveAll}>Save Integration Settings</Button>
        </div>
      </CardContent>
    </Card>
  );
}
