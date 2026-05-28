import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useDrillStatus } from '@/hooks/useDrillStatus';
import {
  CHAT_MESSAGES_UPDATED_EVENT,
  ChatMessage,
  addChatMessageToStorage,
  getDirectConversationId,
  loadChatMessagesFromStorage,
} from '@/lib/chatStorage';
import { toast } from 'sonner';

type ChatChannel = 'emergency' | 'drill' | 'direct';

const EMERGENCY_CONVERSATION_ID = 'emergency:global';

export default function EmergencyChat() {
  const { user, systemUsers } = useAuth();
  const { activeDrill } = useDrillStatus();

  const [channel, setChannel] = useState<ChatChannel>('emergency');
  const [directRecipientId, setDirectRecipientId] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatMessagesFromStorage());

  const availableRecipients = useMemo(() => {
    return [...(systemUsers ?? [])]
      .filter((entry) => !!user && entry.id !== user.id)
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [systemUsers, user]);

  useEffect(() => {
    if (!directRecipientId && availableRecipients.length > 0) {
      setDirectRecipientId(availableRecipients[0].id);
    }
  }, [availableRecipients, directRecipientId]);

  useEffect(() => {
    if (channel === 'drill' && !activeDrill) {
      setChannel('emergency');
    }
  }, [activeDrill, channel]);

  useEffect(() => {
    const syncMessages = () => {
      setMessages(loadChatMessagesFromStorage());
    };

    window.addEventListener('storage', syncMessages);
    window.addEventListener(CHAT_MESSAGES_UPDATED_EVENT, syncMessages);
    const intervalId = setInterval(syncMessages, 1500);

    return () => {
      window.removeEventListener('storage', syncMessages);
      window.removeEventListener(CHAT_MESSAGES_UPDATED_EVENT, syncMessages);
      clearInterval(intervalId);
    };
  }, []);

  const directConversationId = useMemo(() => {
    if (!user || !directRecipientId) {
      return null;
    }

    return getDirectConversationId(user.id, directRecipientId);
  }, [directRecipientId, user]);

  const activeConversationId = useMemo(() => {
    if (channel === 'emergency') {
      return EMERGENCY_CONVERSATION_ID;
    }

    if (channel === 'drill') {
      return activeDrill ? `drill:${activeDrill.id}` : null;
    }

    return directConversationId;
  }, [activeDrill, channel, directConversationId]);

  const visibleMessages = useMemo(() => {
    if (!activeConversationId) {
      return [];
    }

    return messages.filter((entry) => entry.conversationId === activeConversationId);
  }, [activeConversationId, messages]);

  const currentRecipient = availableRecipients.find((entry) => entry.id === directRecipientId) ?? null;

  const sendMessage = () => {
    if (!user) {
      toast.error('You must be signed in to send messages');
      return;
    }

    if (!activeConversationId) {
      toast.error('Select a chat channel before sending');
      return;
    }

    if (channel === 'direct' && !directRecipientId) {
      toast.error('Choose a user to chat with');
      return;
    }

    try {
      addChatMessageToStorage({
        conversationId: activeConversationId,
        senderUserId: user.id,
        senderName: user.name,
        message: draftMessage,
        recipientUserId: channel === 'direct' ? directRecipientId : undefined,
        priority,
        context: channel,
        drillId: channel === 'drill' ? activeDrill?.id : undefined,
      });

      setDraftMessage('');
      setPriority('normal');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send message');
    }
  };

  if (!user) {
    return (
      <AppLayout>
        <Card>
          <CardHeader>
            <CardTitle>Emergency Chat</CardTitle>
            <CardDescription>Sign in to access team chat.</CardDescription>
          </CardHeader>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Emergency Chat</h1>
            <p className="text-muted-foreground mt-1">
              Coordinate with your team in direct, emergency, and drill channels.
            </p>
          </div>
          {activeDrill && (
            <Badge className="bg-emergency text-emergency-foreground">
              Active {activeDrill.type} drill
            </Badge>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Chat Channels</CardTitle>
            <CardDescription>
              Use emergency chat for broad coordination and drill chat for active evacuation updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={channel === 'emergency' ? 'default' : 'outline'}
                onClick={() => setChannel('emergency')}
              >
                Emergency Channel
              </Button>
              <Button
                type="button"
                variant={channel === 'drill' ? 'default' : 'outline'}
                onClick={() => setChannel('drill')}
                disabled={!activeDrill}
              >
                Drill Channel
              </Button>
              <Button
                type="button"
                variant={channel === 'direct' ? 'default' : 'outline'}
                onClick={() => setChannel('direct')}
              >
                Direct Messages
              </Button>
            </div>

            {channel === 'direct' && (
              <div className="space-y-2 max-w-sm">
                <Label htmlFor="direct-recipient">Conversation partner</Label>
                <select
                  id="direct-recipient"
                  value={directRecipientId}
                  onChange={(event) => setDirectRecipientId(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {availableRecipients.length === 0 ? (
                    <option value="">No available users</option>
                  ) : (
                    availableRecipients.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name} ({entry.role})
                      </option>
                    ))
                  )}
                </select>
                {currentRecipient && (
                  <p className="text-xs text-muted-foreground">
                    Messaging {currentRecipient.name}
                  </p>
                )}
              </div>
            )}

            <div className="rounded-md border border-border p-4 space-y-3 max-h-[380px] overflow-y-auto bg-muted/20">
              {visibleMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages yet in this channel.</p>
              ) : (
                visibleMessages.map((entry) => {
                  const isMine = entry.senderUserId === user.id;

                  return (
                    <div
                      key={entry.id}
                      className={`rounded-md border p-3 ${isMine ? 'bg-primary/10 border-primary/30 ml-6' : 'bg-background mr-6'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">{entry.senderName}</p>
                        <div className="flex items-center gap-2">
                          {entry.priority === 'urgent' && (
                            <Badge variant="destructive">Urgent</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(entry.createdAt, { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-sm whitespace-pre-wrap text-foreground">{entry.message}</p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="chat-message">Message</Label>
                <Textarea
                  id="chat-message"
                  value={draftMessage}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  placeholder="Share location, hazards, and check-in updates"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="space-y-2 w-full sm:w-44">
                  <Label htmlFor="chat-priority">Priority</Label>
                  <select
                    id="chat-priority"
                    value={priority}
                    onChange={(event) => setPriority(event.target.value === 'urgent' ? 'urgent' : 'normal')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="flex-1">
                  <Input
                    value={channel === 'drill' && activeDrill ? `Drill: ${activeDrill.type}` : channel === 'direct' ? `Direct` : 'Emergency'}
                    readOnly
                    aria-label="Active channel"
                    className="text-muted-foreground"
                  />
                </div>

                <Button type="button" onClick={sendMessage} className="sm:w-40">
                  Send Message
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
