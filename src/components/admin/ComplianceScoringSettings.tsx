import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  ComplianceScoringSettings,
  DEFAULT_COMPLIANCE_SCORING_SETTINGS,
} from '@/types/admin';

interface ComplianceScoringSettingsProps {
  settings: ComplianceScoringSettings;
  onChange: (updates: Partial<ComplianceScoringSettings>) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function ComplianceScoringSettingsPanel({ settings, onChange }: ComplianceScoringSettingsProps) {
  const setWeight = (key: keyof ComplianceScoringSettings['weights'], value: number) => {
    onChange({
      weights: {
        ...settings.weights,
        [key]: clamp(value, 0, 100),
      },
    });
  };

  const totalWeight =
    settings.weights.checksQuality +
    settings.weights.officialCoverage +
    settings.weights.drillSuccess +
    settings.weights.areaReportCoverage;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Compliance Scoring Settings</CardTitle>
        <CardDescription>
          Configure weights and scoring rules used for the Safety Compliance Score.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="weight-checks">Checks Quality Weight (%)</Label>
            <Input
              id="weight-checks"
              type="number"
              min={0}
              max={100}
              value={settings.weights.checksQuality}
              onChange={(event) => setWeight('checksQuality', Number(event.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight-officials">Officials Coverage Weight (%)</Label>
            <Input
              id="weight-officials"
              type="number"
              min={0}
              max={100}
              value={settings.weights.officialCoverage}
              onChange={(event) => setWeight('officialCoverage', Number(event.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight-drills">Drill Success Weight (%)</Label>
            <Input
              id="weight-drills"
              type="number"
              min={0}
              max={100}
              value={settings.weights.drillSuccess}
              onChange={(event) => setWeight('drillSuccess', Number(event.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight-area">Area Report Coverage Weight (%)</Label>
            <Input
              id="weight-area"
              type="number"
              min={0}
              max={100}
              value={settings.weights.areaReportCoverage}
              onChange={(event) => setWeight('areaReportCoverage', Number(event.target.value) || 0)}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Current total weight: {totalWeight}%. Scores are normalized automatically if total is not 100.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="partial-credit">Partial Check Credit</Label>
            <Input
              id="partial-credit"
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={settings.checksPartialCredit}
              onChange={(event) => onChange({ checksPartialCredit: clamp(Number(event.target.value) || 0, 0, 1) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="overdue-penalty">Overdue Penalty Per Check</Label>
            <Input
              id="overdue-penalty"
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={settings.overduePenaltyPerCheck}
              onChange={(event) => onChange({ overduePenaltyPerCheck: clamp(Number(event.target.value) || 0, 0, 5) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="drill-threshold">Drill Failure Threshold (%)</Label>
            <Input
              id="drill-threshold"
              type="number"
              min={0}
              max={100}
              value={settings.drillFailureThresholdPercent}
              onChange={(event) => onChange({ drillFailureThresholdPercent: clamp(Number(event.target.value) || 0, 0, 100) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Area Report Period</Label>
            <Select
              value={settings.areaReportPeriod}
              onValueChange={(value: 'monthly' | 'quarterly') => onChange({ areaReportPeriod: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reporting period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onChange(DEFAULT_COMPLIANCE_SCORING_SETTINGS)}
          >
            Reset Scoring Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
