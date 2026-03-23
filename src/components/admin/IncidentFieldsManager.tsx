import { useState } from 'react';
import { Plus, FileText, Trash2, Edit2, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CustomIncidentField } from '@/types/admin';
import { toast } from 'sonner';

interface IncidentFieldsManagerProps {
  fields: CustomIncidentField[];
  onAdd: (field: Omit<CustomIncidentField, 'id'>) => CustomIncidentField;
  onUpdate: (id: string, updates: Partial<CustomIncidentField>) => void;
  onDelete: (id: string) => void;
}

const fieldTypeLabels: Record<CustomIncidentField['type'], string> = {
  text: 'Text',
  textarea: 'Long Text',
  select: 'Dropdown',
  checkbox: 'Checkbox',
  date: 'Date',
  number: 'Number',
};

const fieldTypeIcons: Record<CustomIncidentField['type'], string> = {
  text: '📝',
  textarea: '📄',
  select: '📋',
  checkbox: '☑️',
  date: '📅',
  number: '🔢',
};

export function IncidentFieldsManager({ fields, onAdd, onUpdate, onDelete }: IncidentFieldsManagerProps) {
  const [isAddingField, setIsAddingField] = useState(false);
  const [editingField, setEditingField] = useState<CustomIncidentField | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    type: 'text' as CustomIncidentField['type'],
    required: false,
    placeholder: '',
    options: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      label: '',
      type: 'text',
      required: false,
      placeholder: '',
      options: '',
    });
  };

  const handleAddField = () => {
    if (!formData.label.trim()) {
      toast.error('Field label is required');
      return;
    }
    const name = formData.name.trim() || formData.label.toLowerCase().replace(/\s+/g, '_');
    onAdd({
      name,
      label: formData.label.trim(),
      type: formData.type,
      required: formData.required,
      placeholder: formData.placeholder.trim() || undefined,
      options: formData.type === 'select' ? formData.options.split(',').map(o => o.trim()).filter(Boolean) : undefined,
      order: fields.length + 1,
      enabled: true,
    });
    resetForm();
    setIsAddingField(false);
    toast.success('Custom field added successfully');
  };

  const handleUpdateField = () => {
    if (!editingField) return;
    const name = formData.name.trim() || formData.label.toLowerCase().replace(/\s+/g, '_');
    onUpdate(editingField.id, {
      name,
      label: formData.label.trim(),
      type: formData.type,
      required: formData.required,
      placeholder: formData.placeholder.trim() || undefined,
      options: formData.type === 'select' ? formData.options.split(',').map(o => o.trim()).filter(Boolean) : undefined,
    });
    resetForm();
    setEditingField(null);
    toast.success('Field updated successfully');
  };

  const openEditDialog = (field: CustomIncidentField) => {
    setFormData({
      name: field.name,
      label: field.label,
      type: field.type,
      required: field.required,
      placeholder: field.placeholder || '',
      options: field.options?.join(', ') || '',
    });
    setEditingField(field);
  };

  const toggleFieldEnabled = (field: CustomIncidentField) => {
    onUpdate(field.id, { enabled: !field.enabled });
    toast.success(`Field ${field.enabled ? 'disabled' : 'enabled'}`);
  };

  const fieldFormContent = (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Field Label *</Label>
          <Input
            placeholder="e.g., Witnesses"
            value={formData.label}
            onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Field Name</Label>
          <Input
            placeholder="e.g., witnesses (auto-generated)"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">Internal name, auto-generated from label if empty</p>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Field Type</Label>
        <Select value={formData.type} onValueChange={(value: CustomIncidentField['type']) => setFormData(prev => ({ ...prev, type: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(fieldTypeLabels) as CustomIncidentField['type'][]).map((type) => (
              <SelectItem key={type} value={type}>
                <span className="flex items-center gap-2">
                  <span>{fieldTypeIcons[type]}</span>
                  <span>{fieldTypeLabels[type]}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {formData.type === 'select' && (
        <div className="space-y-2">
          <Label>Options</Label>
          <Textarea
            placeholder="Option 1, Option 2, Option 3"
            value={formData.options}
            onChange={(e) => setFormData(prev => ({ ...prev, options: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">Comma-separated list of options</p>
        </div>
      )}
      {(formData.type === 'text' || formData.type === 'textarea' || formData.type === 'number') && (
        <div className="space-y-2">
          <Label>Placeholder</Label>
          <Input
            placeholder="Enter placeholder text..."
            value={formData.placeholder}
            onChange={(e) => setFormData(prev => ({ ...prev, placeholder: e.target.value }))}
          />
        </div>
      )}
      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.required}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, required: checked }))}
        />
        <Label>Required field</Label>
      </div>
    </div>
  );

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Custom Incident Fields
          </CardTitle>
          <CardDescription>
            Add custom fields to incident reports
          </CardDescription>
        </div>
        <Dialog open={isAddingField} onOpenChange={(open) => { setIsAddingField(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Field
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Field</DialogTitle>
              <DialogDescription>
                Add a new field to incident reports.
              </DialogDescription>
            </DialogHeader>
            {fieldFormContent}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsAddingField(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleAddField}>Add Field</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {fields.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No custom fields configured yet.</p>
            <p className="text-sm">Click "Add Field" to customize incident reports.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {fields.sort((a, b) => a.order - b.order).map((field) => (
              <div 
                key={field.id} 
                className={`flex items-center justify-between p-4 border rounded-lg bg-background transition-opacity ${!field.enabled ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className="cursor-grab text-muted-foreground">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <div className="text-2xl">{fieldTypeIcons[field.type]}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{field.label}</h4>
                      {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                      {!field.enabled && <Badge variant="secondary" className="text-xs">Disabled</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {fieldTypeLabels[field.type]}
                      {field.options && field.options.length > 0 && ` • ${field.options.length} options`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleFieldEnabled(field)}
                    title={field.enabled ? 'Disable field' : 'Enable field'}
                  >
                    {field.enabled ? (
                      <ToggleRight className="w-5 h-5 text-safe" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                    )}
                  </Button>
                  <Dialog open={editingField?.id === field.id} onOpenChange={(open) => { if (!open) { setEditingField(null); resetForm(); } }}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(field)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Field</DialogTitle>
                      </DialogHeader>
                      {fieldFormContent}
                      <DialogFooter>
                        <Button variant="outline" onClick={() => { setEditingField(null); resetForm(); }}>Cancel</Button>
                        <Button onClick={handleUpdateField}>Save Changes</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Field?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the "{field.label}" field from incident reports.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(field.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
