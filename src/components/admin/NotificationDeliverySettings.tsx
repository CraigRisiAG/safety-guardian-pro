import { useEffect, useMemo, useState } from 'react';
import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_NOTIFICATION_DELIVERY_CONFIG,
  NotificationChannel,
  NotificationDeliveryConfig,
  loadNotificationDeliveryConfig,
  saveNotificationDeliveryConfig,
} from '@/lib/notifications';
import { toast } from 'sonner';

const toggleChannel = (
  channels: NotificationChannel[],
  channel: NotificationChannel,
  nextChecked: boolean,
): NotificationChannel[] => {
  if (channel === 'in_app') {
    return ['in_app', ...channels.filter((entry) => entry !== 'in_app')];
  }

  const next = nextChecked
    ? Array.from(new Set([...channels, channel]))
    : channels.filter((entry) => entry !== channel);

  if (!next.includes('in_app')) {
    next.unshift('in_app');
  }

  return next;
};

export function NotificationDeliverySettings() {
  const [config, setConfig] = useState<NotificationDeliveryConfig>(
    DEFAULT_NOTIFICATION_DELIVERY_CONFIG,
  );

  useEffect(() => {
    setConfig(loadNotificationDeliveryConfig());
  }, []);

  const hasAnyExternalChannel = useMemo(
    () => config.drillChannels.includes('email') || config.drillChannels.includes('sms') || config.incidentChannels.includes('email') || config.incidentChannels.includes('sms'),
    [config],
  );

  const saveConfig = (next: NotificationDeliveryConfig) => {
    setConfig(next);
    saveNotificationDeliveryConfig(next);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Delivery
        </CardTitle>
        <CardDescription>
          Configure how drill and incident alerts are delivered. In-app is always enabled. Email/SMS can be toggled now and connected to providers later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-provider" className="text-sm font-medium">Enable Email Provider</Label>
              <Switch
                id="email-provider"
                checked={config.emailEnabled}
                onCheckedChange={(checked) =>
                  saveConfig({
                    ...config,
                    emailEnabled: checked,
                  })
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              When enabled, email notifications are queued for provider delivery.
            </p>
          </div>

          <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="sms-provider" className="text-sm font-medium">Enable SMS Provider</Label>
              <Switch
                id="sms-provider"
                checked={config.smsEnabled}
                onCheckedChange={(checked) =>
                  saveConfig({
                    ...config,
                    smsEnabled: checked,
                  })
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              When enabled, SMS notifications are queued for provider delivery.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3 rounded-lg border border-border p-4">
            <h4 className="text-sm font-semibold">Drill Alerts</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox checked disabled />
                <Label className="flex items-center gap-2 text-sm opacity-70">
                  <MessageSquare className="w-4 h-4" />
                  In-app (always on)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="drill-email"
                  checked={config.drillChannels.includes('email')}
                  onCheckedChange={(checked) =>
                    saveConfig({
                      ...config,
                      drillChannels: toggleChannel(config.drillChannels, 'email', checked === true),
                    })
                  }
                />
                <Label htmlFor="drill-email" className="flex items-center gap-2 text-sm cursor-pointer">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="drill-sms"
                  checked={config.drillChannels.includes('sms')}
                  onCheckedChange={(checked) =>
                    saveConfig({
                      ...config,
                      drillChannels: toggleChannel(config.drillChannels, 'sms', checked === true),
                    })
                  }
                />
                <Label htmlFor="drill-sms" className="flex items-center gap-2 text-sm cursor-pointer">
                  <Smartphone className="w-4 h-4" />
                  SMS
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border p-4">
            <h4 className="text-sm font-semibold">Incident Alerts</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox checked disabled />
                <Label className="flex items-center gap-2 text-sm opacity-70">
                  <MessageSquare className="w-4 h-4" />
                  In-app (always on)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="incident-email"
                  checked={config.incidentChannels.includes('email')}
                  onCheckedChange={(checked) =>
                    saveConfig({
                      ...config,
                      incidentChannels: toggleChannel(config.incidentChannels, 'email', checked === true),
                    })
                  }
                />
                <Label htmlFor="incident-email" className="flex items-center gap-2 text-sm cursor-pointer">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="incident-sms"
                  checked={config.incidentChannels.includes('sms')}
                  onCheckedChange={(checked) =>
                    saveConfig({
                      ...config,
                      incidentChannels: toggleChannel(config.incidentChannels, 'sms', checked === true),
                    })
                  }
                />
                <Label htmlFor="incident-sms" className="flex items-center gap-2 text-sm cursor-pointer">
                  <Smartphone className="w-4 h-4" />
                  SMS
                </Label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">
            {hasAnyExternalChannel
              ? 'External channels are enabled. Ensure provider credentials are configured in your deployment environment.'
              : 'Only in-app notifications are active.'}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              saveConfig(DEFAULT_NOTIFICATION_DELIVERY_CONFIG);
              toast.success('Notification settings reset to defaults');
            }}
          >
            Reset Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
