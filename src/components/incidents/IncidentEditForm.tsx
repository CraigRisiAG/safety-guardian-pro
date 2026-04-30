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
import { Save } from 'lucide-react';
import { toast } from 'sonner';

interface IncidentEditFormProps {
  incident: Incident;
  onSave: (data: {
    title: string;
    description: string;
    severity: IncidentSeverity;
    status: IncidentStatus;
    rootCause?: string;
  }) => void;
  onCancel: () => void;
}

export function IncidentEditForm({ incident, onSave, onCancel }: IncidentEditFormProps) {
  const [title, setTitle] = useState(incident.title);
  const [description, setDescription] = useState(incident.description);
  const [severity, setSeverity] = useState<IncidentSeverity>(incident.severity);
  const [status, setStatus] = useState<IncidentStatus>(incident.status);
  const [rootCause, setRootCause] = useState(incident.rootCause ?? '');

  const isClosed = status === 'closed';

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (isClosed && !rootCause.trim()) {
      toast.error('Root cause is required when closing an incident');
      return;
    }

    onSave({
      title,
      description,
      severity,
      status,
      rootCause: rootCause.trim() || undefined,
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

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" className="flex-1 gap-2">
          <Save className="w-4 h-4" />
          Save Changes
        </Button>
      </div>
    </form>
  );
}
