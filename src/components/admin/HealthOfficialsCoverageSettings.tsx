import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ALL_WORK_DAYS, WORK_DAY_LABELS, WorkDay } from '@/types/admin';

interface HealthOfficialsCoverageSettingsProps {
  requiredDays: WorkDay[];
  onChange: (days: WorkDay[]) => void;
}

export function HealthOfficialsCoverageSettings({ requiredDays, onChange }: HealthOfficialsCoverageSettingsProps) {
  const toggleDay = (day: WorkDay) => {
    const isIncluded = requiredDays.includes(day);
    const nextDays = isIncluded
      ? requiredDays.filter((entry) => entry !== day)
      : [...requiredDays, day];

    onChange(nextDays);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Health Officials Coverage Days</CardTitle>
        <CardDescription>
          Choose which days require health/safety official coverage. Non-required days are excluded from gap calculations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {ALL_WORK_DAYS.map((day) => {
            const selected = requiredDays.includes(day);
            return (
              <Button
                key={day}
                type="button"
                variant={selected ? 'default' : 'outline'}
                size="sm"
                className="justify-center"
                onClick={() => toggleDay(day)}
              >
                {WORK_DAY_LABELS[day]}
              </Button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Required days selected: {requiredDays.length}
        </p>
      </CardContent>
    </Card>
  );
}
