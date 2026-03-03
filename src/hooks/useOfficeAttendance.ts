import { useMemo } from 'react';
import { useAdminSettings } from './useAdminSettings';
import { WorkDay } from '@/types/admin';

const DAY_INDEX_TO_WORK_DAY: Record<number, WorkDay> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

export function useOfficeAttendance() {
  const { settings } = useAdminSettings();

  const getTodayWorkDay = (): WorkDay => {
    return DAY_INDEX_TO_WORK_DAY[new Date().getDay()];
  };

  const getWorkDayFromDate = (date: Date): WorkDay => {
    return DAY_INDEX_TO_WORK_DAY[date.getDay()];
  };

  // Get personnel expected in office today
  const personnelInOfficeToday = useMemo(() => {
    const today = getTodayWorkDay();
    return settings.userPermissions.filter(p => p.workDays.includes(today));
  }, [settings.userPermissions]);

  // Get personnel in office on a specific day
  const getPersonnelForDay = (day: WorkDay) => {
    return settings.userPermissions.filter(p => p.workDays.includes(day));
  };

  // Get expected headcount for a building on a given day
  const getExpectedHeadcount = (buildingId: string, day?: WorkDay) => {
    const targetDay = day || getTodayWorkDay();
    return settings.userPermissions.filter(p =>
      p.workDays.includes(targetDay) && p.buildingAccess.includes(buildingId)
    );
  };

  // Get expected headcount for a specific floor
  const getExpectedFloorHeadcount = (floorId: string, day?: WorkDay) => {
    const targetDay = day || getTodayWorkDay();
    return settings.userPermissions.filter(p =>
      p.workDays.includes(targetDay) && p.primaryFloorId === floorId
    );
  };

  return {
    personnelInOfficeToday,
    getPersonnelForDay,
    getExpectedHeadcount,
    getExpectedFloorHeadcount,
    getTodayWorkDay,
    getWorkDayFromDate,
  };
}
