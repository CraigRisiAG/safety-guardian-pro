import { useState } from 'react';
import { Incident, IncidentSeverity, IncidentStatus } from '@/types/safety';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CustomIncidentField } from '@/types/admin';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

interface IncidentEditFormProps {
  incident: Incident;
  customFields?: CustomIncidentField[];
  onSave: (data: {
    title: string;
    description: string;
    severity: IncidentSeverity;
    status: IncidentStatus;
    rootCause?: string;
    customFieldValues: Record<string, string | boolean | number>;
  }) => void;
  onCancel: () => void;
}

export function IncidentEditForm({ incident, customFields = [], onSave, onCancel }: IncidentEditFormProps) {
  const [title, setTitle] = useState(incident.title);
  const [description, setDescription] = useState(incident.description);
  const [severity, setSeverity] = useState<IncidentSeverity>(incident.severity);
  const [status, setStatus] = useState<IncidentStatus>(incident.status);
  const [rootCause, setRootCause] = useState(incident.rootCause ?? '');
  const [customValues, setCustomValues] = useState<Record<string, string | boolean | number>>(
    incident.customFieldValues ?? {},
  );

  const isClosed = status === 'closed';
  const activeFields = customFields
    .filter((f) => f.enabled)
    .sort((a, b) => a.order - b.order);

  const setFieldValue = (name: string, value: string | boolean | number) => {
    setCustomValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (isClosed && !rootCause.trim()) {
      toast.error('Root cause is required when closing an incident');
      return;
    }

    if (isClosed) {
      for (const field of activeFields) {
        if (!field.required) continue;
        const value = customValues[field.name];
        const empty =
          value === undefined ||
          value === '' ||
          (field.type === 'checkbox' && value !== true);
        if (empty) {
          toast.error(`${field.label} is required to close this incident`);
          return;
        }
      }
    }

    onSave({
      title,
      description,
      severity,
      status,
      rootCause: rootCause.trim() || undefined,
      customFieldValues: customValues,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="incident-edit-title">Incident Title</Label>
        <Input
          id="incident-edit-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="incident-edit-description">Description</Label>
        <Textarea
          id="incident-edit-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Severity</Label>
          <Select value={severity} onValueChange={(value) => setSeverity(value as IncidentSeverity)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as IncidentStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isClosed && (
        <div className="space-y-2">
          <Label htmlFor="incident-root-cause">Root Cause</Label>
          <Textarea
            id="incident-root-cause"
            value={rootCause}
            onChange={(event) => setRootCause(event.target.value)}
            placeholder="Document the root cause before closing this incident"
            rows={3}
            required
          />
        </div>
      )}

      {activeFields.length > 0 && (
        <div className="space-y-4 pt-2 border-t border-border">
          {activeFields.map((field) => {
            const value = customValues[field.name];
            const labelEl = (
              <Label>
                {field.label}
                {field.required && <span className="text-emergency ml-1">*</span>}
              </Label>
            );
            if (field.type === 'textarea') {
              return (
                <div key={field.id} className="space-y-2">
                  {labelEl}
                  <Textarea
                    value={(value as string) ?? ''}
                    placeholder={field.placeholder}
                    onChange={(e) => setFieldValue(field.name, e.target.value)}
                    rows={3}
                  />
                </div>
              );
            }
            if (field.type === 'select') {
              return (
                <div key={field.id} className="space-y-2">
                  {labelEl}
                  <Select value={(value as string) ?? ''} onValueChange={(v) => setFieldValue(field.name, v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options || []).map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            }
            if (field.type === 'checkbox') {
              return (
                <div key={field.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`cf-edit-${field.id}`}
                    checked={value === true}
                    onCheckedChange={(checked) => setFieldValue(field.name, checked === true)}
                  />
                  <Label htmlFor={`cf-edit-${field.id}`} className="cursor-pointer">
                    {field.label}
                    {field.required && <span className="text-emergency ml-1">*</span>}
                  </Label>
                </div>
              );
            }
            return (
              <div key={field.id} className="space-y-2">
                {labelEl}
                <Input
                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                  value={(value as string | number) ?? ''}
                  placeholder={field.placeholder}
                  onChange={(e) =>
                    setFieldValue(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)
                  }
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" className="flex-1 gap-2">
          <Save className="w-4 h-4" />
          Update Incident
        </Button>
      </div>
    </form>
  );
}
