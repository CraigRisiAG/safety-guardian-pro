import { describe, expect, it } from 'vitest';
import { getNextComplianceDueDate } from '@/utils/complianceRecurrence';
import { ComplianceCheck } from '@/types/admin';

const baseCheck: ComplianceCheck = {
  id: 'check-1',
  name: 'Recurring check',
  description: 'Recurring',
  frequency: 'monthly',
  buildingIds: ['b-1'],
  assignedUsers: ['u-1'],
  status: 'pending',
  category: 'fire-safety',
  isRecurring: true,
  recurrencePattern: 'monthly_same_date',
  startDate: new Date('2026-01-31T09:00:00.000Z'),
  nextDue: new Date('2026-01-31T09:00:00.000Z'),
};

describe('getNextComplianceDueDate', () => {
  it('supports monthly last day recurrence', () => {
    const check: ComplianceCheck = {
      ...baseCheck,
      recurrencePattern: 'monthly_last_day',
    };

    const next = getNextComplianceDueDate(check, new Date('2026-01-31T09:00:00.000Z'));
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(28);
  });

  it('supports monthly last working day recurrence', () => {
    const check: ComplianceCheck = {
      ...baseCheck,
      recurrencePattern: 'monthly_last_working_day',
    };

    const next = getNextComplianceDueDate(check, new Date('2026-01-31T09:00:00.000Z'));
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(27);
    expect(next.getDay()).toBe(5);
  });

  it('supports monthly specific week recurrence', () => {
    const check: ComplianceCheck = {
      ...baseCheck,
      recurrencePattern: 'monthly_week_of_month',
      recurrenceWeekOfMonth: 2,
      recurrenceWeekday: 1,
    };

    const next = getNextComplianceDueDate(check, new Date('2026-01-12T09:00:00.000Z'));
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(1);
    expect(next.getDay()).toBe(1);
    expect(next.getDate()).toBe(9);
  });
});
