import { useEffect, useMemo, useState } from 'react';
import { BellRing, Filter, Inbox, Mail, MessageSquare, Smartphone, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  NOTIFICATIONS_UPDATED_EVENT,
  NotificationChannel,
  NotificationRecord,
  NotificationStatus,
  NotificationType,
  clearNotifications,
  loadNotificationsFromStorage,
} from '@/lib/notifications';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const channelLabel: Record<NotificationChannel, string> = {
  in_app: 'In-app',
  email: 'Email',
  sms: 'SMS',
};

const typeLabel: Record<NotificationType, string> = {
  drill_started: 'Drill',
  incident_reported: 'Incident',
};

const statusVariant: Record<NotificationStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  sent: 'default',
  queued: 'secondary',
  skipped: 'destructive',
};

const statusLabel: Record<NotificationStatus, string> = {
  sent: 'Sent',
  queued: 'Queued',
  skipped: 'Skipped',
};

export function NotificationCenter() {
  const [records, setRecords] = useState<NotificationRecord[]>(() => loadNotificationsFromStorage());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | NotificationStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | NotificationType>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | NotificationChannel>('all');

  useEffect(() => {
    const sync = () => setRecords(loadNotificationsFromStorage());

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === 'safeguard_notifications') {
        sync();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, sync);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, sync);
    };
  }, []);

  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return records.filter((record) => {
      if (statusFilter !== 'all' && record.status !== statusFilter) {
        return false;
      }

      if (typeFilter !== 'all' && record.type !== typeFilter) {
        return false;
      }

      if (channelFilter !== 'all' && record.channel !== channelFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        record.message,
        record.recipientName,
        record.recipientEmail || '',
        record.deliveryNote || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [channelFilter, records, searchQuery, statusFilter, typeFilter]);

  const summary = useMemo(() => {
    return {
      total: records.length,
      sent: records.filter((record) => record.status === 'sent').length,
      queued: records.filter((record) => record.status === 'queued').length,
      skipped: records.filter((record) => record.status === 'skipped').length,
    };
  }, [records]);

  const handleClear = () => {
    clearNotifications();
    toast.success('Notification center cleared');
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="w-5 h-5" />
          Notification Center
        </CardTitle>
        <CardDescription>
          Monitor drill and incident notification delivery across in-app, email, and SMS channels.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-semibold">{summary.total}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Sent</p>
            <p className="text-xl font-semibold text-safe">{summary.sent}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Queued</p>
            <p className="text-xl font-semibold text-warning">{summary.queued}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Skipped</p>
            <p className="text-xl font-semibold text-emergency">{summary.skipped}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="notification-search" className="text-xs text-muted-foreground">Search</Label>
            <Input
              id="notification-search"
              placeholder="Search message, user, or delivery note"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={statusFilter} onValueChange={(value: 'all' | NotificationStatus) => setStatusFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select value={typeFilter} onValueChange={(value: 'all' | NotificationType) => setTypeFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="drill_started">Drill</SelectItem>
                <SelectItem value="incident_reported">Incident</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="w-3.5 h-3.5" />
            <span>
              Showing {filteredRecords.length} of {records.length} records
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Select value={channelFilter} onValueChange={(value: 'all' | NotificationChannel) => setChannelFilter(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                <SelectItem value="in_app">In-app</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={handleClear} disabled={records.length === 0} className="gap-2">
              <Trash2 className="w-4 h-4" />
              Clear
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[360px] rounded-lg border border-border">
          <div className="p-3 space-y-2">
            {filteredRecords.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 px-2">
                <Inbox className="w-4 h-4" />
                No notifications match your current filters.
              </div>
            ) : (
              filteredRecords.map((record) => (
                <div key={record.id} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="outline">{typeLabel[record.type]}</Badge>
                    <Badge variant={statusVariant[record.status]}>{statusLabel[record.status]}</Badge>
                    <Badge variant="secondary" className="gap-1">
                      {record.channel === 'email' ? (
                        <Mail className="w-3 h-3" />
                      ) : record.channel === 'sms' ? (
                        <Smartphone className="w-3 h-3" />
                      ) : (
                        <MessageSquare className="w-3 h-3" />
                      )}
                      {channelLabel[record.channel]}
                    </Badge>
                  </div>

                  <p className="text-sm font-medium text-foreground">{record.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recipient: {record.recipientName}
                    {record.recipientEmail ? ` (${record.recipientEmail})` : ''}
                  </p>
                  {record.deliveryNote && (
                    <p className="text-xs text-muted-foreground mt-1">{record.deliveryNote}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(record.createdAt), { addSuffix: true })}
                  </p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
