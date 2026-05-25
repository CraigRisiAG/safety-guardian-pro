import { addDays, addMonths, addWeeks, addYears } from 'date-fns';
import { ComplianceCheck } from '@/types/admin';

const normalizeTime = (target: Date, source: Date) => {
  target.setHours(source.getHours(), source.getMinutes(), source.getSeconds(), source.getMilliseconds());
  return target;
};

const getLastDayOfMonthDate = (year: number, month: number) => {
  return new Date(year, month + 1, 0);
};

const getNextMonthLastDay = (fromDate: Date) => {
  const year = fromDate.getFullYear();
  const month = fromDate.getMonth() + 1;
  return getLastDayOfMonthDate(year, month);
};

const getLastWorkingDayOfMonthDate = (year: number, month: number) => {
  const lastDay = getLastDayOfMonthDate(year, month);
  const dayOfWeek = lastDay.getDay();

  if (dayOfWeek === 6) {
    return new Date(year, month, lastDay.getDate() - 1);
  }

  if (dayOfWeek === 0) {
    return new Date(year, month, lastDay.getDate() - 2);
  }

  return lastDay;
};

const getNextMonthLastWorkingDay = (fromDate: Date) => {
  const year = fromDate.getFullYear();
  const month = fromDate.getMonth() + 1;
  return getLastWorkingDayOfMonthDate(year, month);
};

const getFirstWeekdayInMonth = (year: number, month: number, weekday: number) => {
  const first = new Date(year, month, 1);
  const shift = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + shift);
};

const getLastWeekdayInMonth = (year: number, month: number, weekday: number) => {
  const last = getLastDayOfMonthDate(year, month);
  const shift = (last.getDay() - weekday + 7) % 7;
  return new Date(year, month, last.getDate() - shift);
};

const getNextMonthWeekdayDate = (
  fromDate: Date,
  weekOfMonth: 1 | 2 | 3 | 4 | 'last',
  weekday: number,
) => {
  const year = fromDate.getFullYear();
  const month = fromDate.getMonth() + 1;

  if (weekOfMonth === 'last') {
    return getLastWeekdayInMonth(year, month, weekday);
  }

  const firstWeekday = getFirstWeekdayInMonth(year, month, weekday);
  const candidate = new Date(year, month, firstWeekday.getDate() + (weekOfMonth - 1) * 7);

  if (candidate.getMonth() !== month) {
    return getLastWeekdayInMonth(year, month, weekday);
  }

  return candidate;
};

const getNextMonthlyDueDate = (check: ComplianceCheck, fromDate: Date): Date => {
  const pattern = check.recurrencePattern ?? 'monthly_same_date';

  if (pattern === 'monthly_last_day') {
    return normalizeTime(getNextMonthLastDay(fromDate), fromDate);
  }

  if (pattern === 'monthly_last_working_day') {
    return normalizeTime(getNextMonthLastWorkingDay(fromDate), fromDate);
  }

  if (pattern === 'monthly_week_of_month') {
    const anchor = check.startDate ? new Date(check.startDate) : new Date(check.nextDue);
    const weekOfMonth = check.recurrenceWeekOfMonth ?? Math.min(4, Math.ceil(anchor.getDate() / 7)) as 1 | 2 | 3 | 4;
    const weekday = check.recurrenceWeekday ?? anchor.getDay();
    return normalizeTime(getNextMonthWeekdayDate(fromDate, weekOfMonth, weekday), fromDate);
  }

  const nextMonth = addMonths(fromDate, 1);
  const anchor = check.startDate ? new Date(check.startDate) : fromDate;
  const day = Math.min(anchor.getDate(), getLastDayOfMonthDate(nextMonth.getFullYear(), nextMonth.getMonth()).getDate());
  return normalizeTime(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day), fromDate);
};

export const getNextComplianceDueDate = (check: ComplianceCheck, fromDate: Date): Date => {
  if (check.frequency === 'daily') {
    return addDays(fromDate, check.customFrequencyDays ?? 1);
  }

  if (check.frequency === 'weekly') {
    return addWeeks(fromDate, 1);
  }

  if (check.frequency === 'quarterly') {
    return addMonths(fromDate, 3);
  }

  if (check.frequency === 'annually') {
    return addYears(fromDate, 1);
  }

  return getNextMonthlyDueDate(check, fromDate);
};

export const getMonthlyWeekLabels = (): Array<{ value: '1' | '2' | '3' | '4' | 'last'; label: string }> => {
  return [
    { value: '1', label: 'First week' },
    { value: '2', label: 'Second week' },
    { value: '3', label: 'Third week' },
    { value: '4', label: 'Fourth week' },
    { value: 'last', label: 'Last week' },
  ];
};

export const WEEKDAY_LABELS: Array<{ value: 0 | 1 | 2 | 3 | 4 | 5 | 6; label: string }> = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];
