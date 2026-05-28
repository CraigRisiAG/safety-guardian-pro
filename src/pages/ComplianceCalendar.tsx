import { AppLayout } from '@/components/layout/AppLayout';
import { ComplianceCalendarDialog } from '@/components/dashboard/ComplianceCalendarDialog';

export default function ComplianceCalendar() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compliance Calendar</h1>
          <p className="text-muted-foreground mt-1">
            View scheduled, completed, overdue, and missed compliance events.
          </p>
        </div>

        <div>
          <ComplianceCalendarDialog displayMode="inline" />
        </div>
      </div>
    </AppLayout>
  );
}
