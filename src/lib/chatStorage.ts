export const CHAT_MESSAGES_STORAGE_KEY = 'safeguard_chat_messages';
export const CHAT_MESSAGES_UPDATED_EVENT = 'safeguard_chat_messages_updated';

export type ChatMessageContext = 'direct' | 'emergency' | 'drill';
export type ChatMessagePriority = 'normal' | 'urgent';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderName: string;
  recipientUserId?: string;
  message: string;
  priority: ChatMessagePriority;
  context: ChatMessageContext;
  drillId?: string;
  createdAt: Date;
}

type StoredChatMessage = Omit<ChatMessage, 'createdAt'> & {
  createdAt?: string;
};

const readStorage = () => {
  try {
    return localStorage.getItem(CHAT_MESSAGES_STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeStorage = (messages: ChatMessage[]) => {
  try {
    localStorage.setItem(CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // no-op
  }
};

const dispatchUpdatedEvent = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CHAT_MESSAGES_UPDATED_EVENT));
  }
};

const parseDateSafe = (value?: string): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeMessage = (raw: StoredChatMessage): ChatMessage | null => {
  if (!raw?.id || !raw?.conversationId || !raw?.senderUserId || !raw?.senderName || !raw?.message) {
    return null;
  }

  const parsedDate = parseDateSafe(raw.createdAt);
  if (!parsedDate) {
    return null;
  }

  return {
    id: raw.id,
    conversationId: raw.conversationId,
    senderUserId: raw.senderUserId,
    senderName: raw.senderName,
    recipientUserId: raw.recipientUserId,
    message: raw.message,
    priority: raw.priority === 'urgent' ? 'urgent' : 'normal',
    context:
      raw.context === 'drill' || raw.context === 'emergency' || raw.context === 'direct'
        ? raw.context
        : 'direct',
    drillId: raw.drillId,
    createdAt: parsedDate,
  };
};

export const loadChatMessagesFromStorage = (): ChatMessage[] => {
  const stored = readStorage();
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return (parsed as StoredChatMessage[])
      .map(normalizeMessage)
      .filter((entry): entry is ChatMessage => !!entry)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  } catch {
    return [];
  }
};

export const saveChatMessagesToStorage = (messages: ChatMessage[]) => {
  const normalized = [...messages].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  writeStorage(normalized);
  dispatchUpdatedEvent();
};

interface CreateChatMessageInput {
  conversationId: string;
  senderUserId: string;
  senderName: string;
  message: string;
  recipientUserId?: string;
  priority?: ChatMessagePriority;
  context: ChatMessageContext;
  drillId?: string;
}

export const addChatMessageToStorage = (input: CreateChatMessageInput): ChatMessage => {
  const trimmedMessage = input.message.trim();
  if (!trimmedMessage) {
    throw new Error('Message is required');
  }

  const message: ChatMessage = {
    id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    conversationId: input.conversationId,
    senderUserId: input.senderUserId,
    senderName: input.senderName,
    recipientUserId: input.recipientUserId,
    message: trimmedMessage,
    priority: input.priority === 'urgent' ? 'urgent' : 'normal',
    context: input.context,
    drillId: input.drillId,
    createdAt: new Date(),
  };

  const existing = loadChatMessagesFromStorage();
  saveChatMessagesToStorage([...existing, message]);

  return message;
};

export const getDirectConversationId = (leftUserId: string, rightUserId: string) => {
  return ['direct', ...[leftUserId, rightUserId].sort()].join(':');
};
