import { useState } from 'react';
import { Plus, ClipboardList, Trash2, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CHECK_TYPE_LABELS, CheckTypeField, CheckTypeFieldType, CompletedCheckRecord } from '@/types/compliance';
import { toast } from 'sonner';

interface CheckTypeFieldsManagerProps {
  fields: CheckTypeField[];
  onAdd: (field: Omit<CheckTypeField, 'id'>) => CheckTypeField;
  onUpdate: (id: string, updates: Partial<CheckTypeField>) => void;
  onDelete: (id: string) => void;
}

const fieldTypeLabels: Record<CheckTypeFieldType, string> = {
  text: 'Text',
  textarea: 'Long Text',
  select: 'Dropdown',
  checkbox: 'Checkbox',
  date: 'Date',
  number: 'Number',
};

const fieldTypeIcons: Record<CheckTypeFieldType, string> = {
  text: '📝',
  textarea: '📄',
  select: '📋',
  checkbox: '☑️',
  date: '📅',
  number: '🔢',
};

const checkTypes = Object.keys(CHECK_TYPE_LABELS) as CompletedCheckRecord['checkType'][];

interface FormState {
  name: string;
  label: string;
  type: CheckTypeFieldType;
  required: boolean;
  placeholder: string;
  options: string;
}

const emptyForm: FormState = {
  name: '',
  label: '',
  type: 'text',
  required: false,
  placeholder: '',
  options: '',
};

export function CheckTypeFieldsManager({ fields, onAdd, onUpdate, onDelete }: CheckTypeFieldsManagerProps) {
  const [activeType, setActiveType] = useState<CompletedCheckRecord['checkType']>('evacuation');
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<CheckTypeField | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);

  const resetForm = () => setFormData(emptyForm);

  const typeFields = fields
    .filter((f) => f.checkType === activeType)
    .sort((a, b) => a.order - b.order);

  const handleAdd = () => {
    if (!formData.label.trim()) {
      toast.error('Field label is required');
      return;
    }
    const name = formData.name.trim() || formData.label.toLowerCase().replace(/\s+/g, '_');
    onAdd({
      checkType: activeType,
      name,
      label: formData.label.trim(),
      type: formData.type,
      required: formData.required,
      placeholder: formData.placeholder.trim() || undefined,
      options: formData.type === 'select' ? formData.options.split(',').map((o) => o.trim()).filter(Boolean) : undefined,
      order: typeFields.length + 1,
      enabled: true,
    });
    resetForm();
    setIsAdding(false);
    toast.success('Field added');
  };

  const handleUpdate = () => {
    if (!editing) return;
    if (!formData.label.trim()) {
      toast.error('Field label is required');
      return;
    }
    const name = formData.name.trim() || formData.label.toLowerCase().replace(/\s+/g, '_');
    onUpdate(editing.id, {
      name,
      label: formData.label.trim(),
      type: formData.type,
      required: formData.required,
      placeholder: formData.placeholder.trim() || undefined,
      options: formData.type === 'select' ? formData.options.split(',').map((o) => o.trim()).filter(Boolean) : undefined,
    });
    setEditing(null);
    resetForm();
    toast.success('Field updated');
  };

  const openEdit = (field: CheckTypeField) => {
    setFormData({
      name: field.name,
      label: field.label,
      type: field.type,
      required: field.required,
      placeholder: field.placeholder || '',
      options: field.options?.join(', ') || '',
    });
    setEditing(field);
  };

  const toggleEnabled = (field: CheckTypeField) => {
    onUpdate(field.id, { enabled: !field.enabled });
  };

  const formContent = (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Field Label *</Label>
          <Input
            placeholder="e.g., Equipment Serial No."
            value={formData.label}
            onChange={(e) => setFormData((p) => ({ ...p, label: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Field Name</Label>
          <Input
            placeholder="auto-generated from label"
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Field Type</Label>
        <Select value={formData.type} onValueChange={(v: CheckTypeFieldType) => setFormData((p) => ({ ...p, type: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(fieldTypeLabels) as CheckTypeFieldType[]).map((t) => (
              <SelectItem key={t} value={t}>
                <span className="flex items-center gap-2"><span>{fieldTypeIcons[t]}</span><span>{fieldTypeLabels[t]}</span></span>
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
            onChange={(e) => setFormData((p) => ({ ...p, options: e.target.value }))}
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
            onChange={(e) => setFormData((p) => ({ ...p, placeholder: e.target.value }))}
          />
        </div>
      )}
      <div className="flex items-center space-x-2">
        <Switch checked={formData.required} onCheckedChange={(c) => setFormData((p) => ({ ...p, required: c }))} />
        <Label>Compulsory field</Label>
      </div>
    </div>
  );

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Check Type Fields
          </CardTitle>
          <CardDescription>
            Add custom fields for each compliance check type. Mark fields as compulsory to require completion.
          </CardDescription>
        </div>
        <Dialog open={isAdding} onOpenChange={(o) => { setIsAdding(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Field</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Field to {CHECK_TYPE_LABELS[activeType]}</DialogTitle>
              <DialogDescription>New field will appear when completing this check type.</DialogDescription>
            </DialogHeader>
            {formContent}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsAdding(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleAdd}>Add Field</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Tabs value={activeType} onValueChange={(v) => setActiveType(v as CompletedCheckRecord['checkType'])}>
          <TabsList className="grid w-full grid-cols-4">
            {checkTypes.map((t) => (
              <TabsTrigger key={t} value={t} className="text-xs sm:text-sm">{CHECK_TYPE_LABELS[t]}</TabsTrigger>
            ))}
          </TabsList>
          {checkTypes.map((t) => (
            <TabsContent key={t} value={t} className="mt-4">
              {typeFields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No custom fields for {CHECK_TYPE_LABELS[t]} yet.</p>
                  <p className="text-sm">Click "Add Field" above to create one.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {typeFields.map((field) => (
                    <div key={field.id} className={`flex items-center justify-between p-4 border rounded-lg bg-background transition-opacity ${!field.enabled ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-4">
                        <div className="text-2xl">{fieldTypeIcons[field.type]}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{field.label}</h4>
                            {field.required && <Badge variant="destructive" className="text-xs">Compulsory</Badge>}
                            {!field.enabled && <Badge variant="secondary" className="text-xs">Disabled</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {fieldTypeLabels[field.type]}
                            {field.options && field.options.length > 0 && ` • ${field.options.length} options`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => toggleEnabled(field)} title={field.enabled ? 'Disable' : 'Enable'}>
                          {field.enabled ? <ToggleRight className="w-5 h-5 text-safe" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                        </Button>
                        <Dialog open={editing?.id === field.id} onOpenChange={(o) => { if (!o) { setEditing(null); resetForm(); } }}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(field)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Field</DialogTitle>
                            </DialogHeader>
                            {formContent}
                            <DialogFooter>
                              <Button variant="outline" onClick={() => { setEditing(null); resetForm(); }}>Cancel</Button>
                              <Button onClick={handleUpdate}>Save Changes</Button>
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
                                This will permanently delete the "{field.label}" field from {CHECK_TYPE_LABELS[field.checkType]}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDelete(field.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}