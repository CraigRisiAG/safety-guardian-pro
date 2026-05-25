import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUDIT_LOGS_STORAGE_KEY,
  AUDIT_LOGS_UPDATED_EVENT,
  loadAuditLogs,
  logAuditEvent,
} from '@/lib/auditLog';

describe('auditLog persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('writes audit logs to storage and dispatches update events', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    const entry = logAuditEvent({
      module: 'admin_settings',
      action: 'update_user_permission',
      description: 'Updated user permission for Alex Brown',
    });

    const stored = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored as string) as Array<{ id: string; createdAt: string; action: string }>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe(entry.id);
    expect(parsed[0].action).toBe('update_user_permission');
    expect(typeof parsed[0].createdAt).toBe('string');

    expect(dispatchSpy).toHaveBeenCalled();
    expect((dispatchSpy.mock.calls[0][0] as CustomEvent).type).toBe(AUDIT_LOGS_UPDATED_EVENT);
  });

  it('rehydrates createdAt as Date and sorts logs newest-first', () => {
    localStorage.setItem(
      AUDIT_LOGS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'log-old',
          createdAt: '2026-05-20T10:00:00.000Z',
          module: 'auth',
          action: 'login',
          description: 'Older entry',
          actor: { name: 'System' },
        },
        {
          id: 'log-new',
          createdAt: '2026-05-21T10:00:00.000Z',
          module: 'auth',
          action: 'logout',
          description: 'Newer entry',
          actor: { name: 'System' },
        },
      ]),
    );

    const logs = loadAuditLogs();

    expect(logs).toHaveLength(2);
    expect(logs[0].id).toBe('log-new');
    expect(logs[0].createdAt).toBeInstanceOf(Date);
    expect(logs[1].id).toBe('log-old');
  });

  it('uses auth_user snapshot when actor is not explicitly provided', () => {
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 'user-7',
        name: 'Jamie Reader',
        email: 'jamie.reader@example.com',
      }),
    );

    const entry = logAuditEvent({
      module: 'incidents',
      action: 'create_incident',
      description: 'Created incident',
    });

    expect(entry.actor.id).toBe('user-7');
    expect(entry.actor.name).toBe('Jamie Reader');
    expect(entry.actor.email).toBe('jamie.reader@example.com');
  });

  it('handles invalid storage JSON safely by returning an empty list', () => {
    localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, '{bad-json');

    const logs = loadAuditLogs();

    expect(logs).toEqual([]);
  });
});
