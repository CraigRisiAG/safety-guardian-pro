import { useState } from 'react';
import { Plus, Building2, Trash2, Edit2, ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { CustomBuilding, CustomFloor, CustomArea } from '@/types/admin';
import { toast } from 'sonner';

interface BuildingsManagerProps {
  buildings: CustomBuilding[];
  onAdd: (building: Omit<CustomBuilding, 'id' | 'createdAt' | 'updatedAt'>) => CustomBuilding;
  onUpdate: (id: string, updates: Partial<CustomBuilding>) => void;
  onDelete: (id: string) => void;
}

export function BuildingsManager({ buildings, onAdd, onUpdate, onDelete }: BuildingsManagerProps) {
  const [isAddingBuilding, setIsAddingBuilding] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<CustomBuilding | null>(null);
  const [expandedBuildings, setExpandedBuildings] = useState<string[]>([]);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBuildingAddress, setNewBuildingAddress] = useState('');

  // Floor management
  const [addingFloorTo, setAddingFloorTo] = useState<string | null>(null);
  const [newFloorName, setNewFloorName] = useState('');

  // Area management
  const [addingAreaTo, setAddingAreaTo] = useState<{ buildingId: string; floorId: string } | null>(null);
  const [newAreaName, setNewAreaName] = useState('');

  const toggleExpanded = (buildingId: string) => {
    setExpandedBuildings(prev => 
      prev.includes(buildingId) 
        ? prev.filter(id => id !== buildingId)
        : [...prev, buildingId]
    );
  };

  const handleAddBuilding = () => {
    if (!newBuildingName.trim()) {
      toast.error('Building name is required');
      return;
    }
    onAdd({
      name: newBuildingName.trim(),
      address: newBuildingAddress.trim() || undefined,
      floors: [],
    });
    setNewBuildingName('');
    setNewBuildingAddress('');
    setIsAddingBuilding(false);
    toast.success('Building added successfully');
  };

  const handleUpdateBuilding = () => {
    if (!editingBuilding) return;
    onUpdate(editingBuilding.id, {
      name: editingBuilding.name,
      address: editingBuilding.address,
    });
    setEditingBuilding(null);
    toast.success('Building updated successfully');
  };

  const handleAddFloor = (buildingId: string) => {
    if (!newFloorName.trim()) {
      toast.error('Floor name is required');
      return;
    }
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;

    const newFloor: CustomFloor = {
      id: `floor-${Date.now()}`,
      buildingId,
      name: newFloorName.trim(),
      level: building.floors.length,
      areas: [],
    };

    onUpdate(buildingId, {
      floors: [...building.floors, newFloor],
    });
    setNewFloorName('');
    setAddingFloorTo(null);
    toast.success('Floor added successfully');
  };

  const handleDeleteFloor = (buildingId: string, floorId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;

    onUpdate(buildingId, {
      floors: building.floors.filter(f => f.id !== floorId),
    });
    toast.success('Floor deleted successfully');
  };

  const handleAddArea = (buildingId: string, floorId: string) => {
    if (!newAreaName.trim()) {
      toast.error('Area name is required');
      return;
    }
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;

    const newArea: CustomArea = {
      id: `area-${Date.now()}`,
      floorId,
      name: newAreaName.trim(),
    };

    onUpdate(buildingId, {
      floors: building.floors.map(f => 
        f.id === floorId 
          ? { ...f, areas: [...f.areas, newArea] }
          : f
      ),
    });
    setNewAreaName('');
    setAddingAreaTo(null);
    toast.success('Area added successfully');
  };

  const handleDeleteArea = (buildingId: string, floorId: string, areaId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;

    onUpdate(buildingId, {
      floors: building.floors.map(f => 
        f.id === floorId 
          ? { ...f, areas: f.areas.filter(a => a.id !== areaId) }
          : f
      ),
    });
    toast.success('Area deleted successfully');
  };

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Buildings & Floors
          </CardTitle>
          <CardDescription>
            Manage your organization's buildings, floors, and areas
          </CardDescription>
        </div>
        <Dialog open={isAddingBuilding} onOpenChange={setIsAddingBuilding}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Building
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Building</DialogTitle>
              <DialogDescription>
                Create a new building to manage floors and areas.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="building-name">Building Name *</Label>
                <Input
                  id="building-name"
                  placeholder="e.g., Main Office Building"
                  value={newBuildingName}
                  onChange={(e) => setNewBuildingName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="building-address">Address (optional)</Label>
                <Input
                  id="building-address"
                  placeholder="e.g., 123 Main Street"
                  value={newBuildingAddress}
                  onChange={(e) => setNewBuildingAddress(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingBuilding(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddBuilding}>Add Building</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {buildings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No buildings configured yet.</p>
            <p className="text-sm">Click "Add Building" to get started.</p>
          </div>
        ) : (
          buildings.map((building) => (
            <Collapsible
              key={building.id}
              open={expandedBuildings.includes(building.id)}
              onOpenChange={() => toggleExpanded(building.id)}
            >
              <div className="border rounded-lg overflow-hidden">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors">
                    <div className="flex items-center gap-3">
                      {expandedBuildings.includes(building.id) ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                      <Building2 className="w-5 h-5 text-primary" />
                      <div>
                        <h3 className="font-medium">{building.name}</h3>
                        {building.address && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {building.address}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Badge variant="secondary">
                        {building.floors.length} floor{building.floors.length !== 1 ? 's' : ''}
                      </Badge>
                      <Dialog open={editingBuilding?.id === building.id} onOpenChange={(open) => !open && setEditingBuilding(null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setEditingBuilding(building)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Building</DialogTitle>
                          </DialogHeader>
                          {editingBuilding && (
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Building Name</Label>
                                <Input
                                  value={editingBuilding.name}
                                  onChange={(e) => setEditingBuilding({ ...editingBuilding, name: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Address</Label>
                                <Input
                                  value={editingBuilding.address || ''}
                                  onChange={(e) => setEditingBuilding({ ...editingBuilding, address: e.target.value })}
                                />
                              </div>
                            </div>
                          )}
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingBuilding(null)}>Cancel</Button>
                            <Button onClick={handleUpdateBuilding}>Save Changes</Button>
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
                            <AlertDialogTitle>Delete Building?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{building.name}" and all its floors and areas. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(building.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 space-y-4 border-t">
                    {/* Floors */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-muted-foreground">Floors</h4>
                        {addingFloorTo === building.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Floor name"
                              className="h-8 w-40"
                              value={newFloorName}
                              onChange={(e) => setNewFloorName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddFloor(building.id)}
                            />
                            <Button size="sm" onClick={() => handleAddFloor(building.id)}>Add</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setAddingFloorTo(null); setNewFloorName(''); }}>Cancel</Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => setAddingFloorTo(building.id)}>
                            <Plus className="w-3 h-3 mr-1" />
                            Add Floor
                          </Button>
                        )}
                      </div>
                      {building.floors.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No floors added yet</p>
                      ) : (
                        <div className="space-y-2">
                          {building.floors.map((floor) => (
                            <div key={floor.id} className="border rounded-lg p-3 bg-background">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{floor.name}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {floor.areas.length} area{floor.areas.length !== 1 ? 's' : ''}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive"
                                    onClick={() => handleDeleteFloor(building.id, floor.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                              {/* Areas */}
                              <div className="pl-4 space-y-1">
                                {floor.areas.map((area) => (
                                  <div key={area.id} className="flex items-center justify-between text-sm py-1">
                                    <span className="text-muted-foreground">{area.name}</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 text-destructive opacity-50 hover:opacity-100"
                                      onClick={() => handleDeleteArea(building.id, floor.id, area.id)}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                                {addingAreaTo?.buildingId === building.id && addingAreaTo?.floorId === floor.id ? (
                                  <div className="flex items-center gap-2 pt-1">
                                    <Input
                                      placeholder="Area name"
                                      className="h-7 text-sm"
                                      value={newAreaName}
                                      onChange={(e) => setNewAreaName(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handleAddArea(building.id, floor.id)}
                                    />
                                    <Button size="sm" className="h-7 text-xs" onClick={() => handleAddArea(building.id, floor.id)}>Add</Button>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingAreaTo(null); setNewAreaName(''); }}>Cancel</Button>
                                  </div>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs text-muted-foreground"
                                    onClick={() => setAddingAreaTo({ buildingId: building.id, floorId: floor.id })}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add Area
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))
        )}
      </CardContent>
    </Card>
  );
}
