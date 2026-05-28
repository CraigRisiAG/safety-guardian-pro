import { beforeEach, describe, expect, it } from 'vitest';
import {
  CHAT_MESSAGES_STORAGE_KEY,
  addChatMessageToStorage,
  getDirectConversationId,
  loadChatMessagesFromStorage,
  saveChatMessagesToStorage,
} from '@/lib/chatStorage';

describe('chatStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('generates stable direct conversation ids regardless of user order', () => {
    const first = getDirectConversationId('user-2', 'user-1');
    const second = getDirectConversationId('user-1', 'user-2');

    expect(first).toBe('direct:user-1:user-2');
    expect(second).toBe(first);
  });

  it('persists and reloads chat messages sorted by createdAt', () => {
    const now = new Date('2026-05-28T12:00:00.000Z');
    const later = new Date('2026-05-28T12:02:00.000Z');

    saveChatMessagesToStorage([
      {
        id: 'msg-2',
        conversationId: 'emergency:global',
        senderUserId: 'user-2',
        senderName: 'User Two',
        message: 'Second',
        priority: 'normal',
        context: 'emergency',
        createdAt: later,
      },
      {
        id: 'msg-1',
        conversationId: 'emergency:global',
        senderUserId: 'user-1',
        senderName: 'User One',
        message: 'First',
        priority: 'urgent',
        context: 'emergency',
        createdAt: now,
      },
    ]);

    const loaded = loadChatMessagesFromStorage();

    expect(loaded).toHaveLength(2);
    expect(loaded[0].id).toBe('msg-1');
    expect(loaded[1].id).toBe('msg-2');
    expect(loaded[0].priority).toBe('urgent');
  });

  it('adds new chat messages and trims whitespace', () => {
    const created = addChatMessageToStorage({
      conversationId: 'direct:user-1:user-2',
      senderUserId: 'user-1',
      senderName: 'User One',
      recipientUserId: 'user-2',
      message: '  Need assistance near stairwell  ',
      priority: 'urgent',
      context: 'direct',
    });

    const loaded = loadChatMessagesFromStorage();

    expect(created.message).toBe('Need assistance near stairwell');
    expect(loaded).toHaveLength(1);
    expect(loaded[0].message).toBe('Need assistance near stairwell');
    expect(loaded[0].priority).toBe('urgent');
    expect(localStorage.getItem(CHAT_MESSAGES_STORAGE_KEY)).toBeTruthy();
  });

  it('rejects empty messages', () => {
    expect(() =>
      addChatMessageToStorage({
        conversationId: 'emergency:global',
        senderUserId: 'user-1',
        senderName: 'User One',
        message: '   ',
        context: 'emergency',
      }),
    ).toThrow('Message is required');
  });
});
