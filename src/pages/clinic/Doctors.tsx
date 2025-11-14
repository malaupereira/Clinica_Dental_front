import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { UserPlus, Edit, Trash2 } from 'lucide-react';

export default function Doctors() {
  const { doctors, specialties, addDoctor, updateDoctor, deleteDoctor, refreshDoctors, loading } = useApp();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingDoctor, setEditingDoctor] = useState<{ id: string; name: string; specialtyIds: string[]; paymentType: 'comision' | 'sueldo' } | null>(null);
  const [newDoctor, setNewDoctor] = useState({ name: '', specialtyIds: [] as string[], paymentType: 'comision' as 'comision' | 'sueldo' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) {
      toast.error('Ya se está procesando una operación');
      return;
    }
    
    if (!newDoctor.name.trim()) {
      toast.error('Ingrese el nombre del doctor');
      return;
    }

    if (newDoctor.specialtyIds.length === 0) {
      toast.error('Seleccione al menos una especialidad');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoctor({
        id: Date.now().toString(), // Este ID será reemplazado por el ID real de la base de datos
        name: newDoctor.name.trim(),
        specialtyIds: newDoctor.specialtyIds,
        paymentType: newDoctor.paymentType
      });

      toast.success('Doctor agregado exitosamente');
      setNewDoctor({ name: '', specialtyIds: [], paymentType: 'comision' });
      setIsAddDialogOpen(false);
      
      // Recargar los doctores para obtener los datos actualizados
      await refreshDoctors();
    } catch (error) {
      console.error('Error adding doctor:', error);
      toast.error('Error al agregar el doctor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) {
      toast.error('Ya se está procesando una operación');
      return;
    }
    
    if (!editingDoctor) return;

    if (!editingDoctor.name.trim()) {
      toast.error('Ingrese el nombre del doctor');
      return;
    }

    if (editingDoctor.specialtyIds.length === 0) {
      toast.error('Seleccione al menos una especialidad');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDoctor(editingDoctor.id, {
        id: editingDoctor.id,
        name: editingDoctor.name.trim(),
        specialtyIds: editingDoctor.specialtyIds,
        paymentType: editingDoctor.paymentType
      });

      toast.success('Doctor actualizado exitosamente');
      setEditingDoctor(null);
      setIsEditDialogOpen(false);
      
      // Recargar los doctores para obtener los datos actualizados
      await refreshDoctors();
    } catch (error) {
      console.error('Error updating doctor:', error);
      toast.error('Error al actualizar el doctor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isSubmitting) {
      toast.error('Ya se está procesando una operación');
      return;
    }
    
    setDeletingId(id);
    setIsSubmitting(true);
    
    try {
      await deleteDoctor(id);
      toast.success('Doctor eliminado exitosamente');
      setDeleteConfirmId(null);
      
      // Recargar los doctores para obtener los datos actualizados
      await refreshDoctors();
    } catch (error) {
      console.error('Error deleting doctor:', error);
      toast.error('Error al eliminar el doctor');
    } finally {
      setIsSubmitting(false);
      setDeletingId(null);
    }
  };

  const toggleSpecialtyAdd = (specialtyId: string) => {
    if (isSubmitting) return;
    
    setNewDoctor(prev => ({
      ...prev,
      specialtyIds: prev.specialtyIds.includes(specialtyId)
        ? prev.specialtyIds.filter(id => id !== specialtyId)
        : [...prev.specialtyIds, specialtyId]
    }));
  };

  const toggleSpecialtyEdit = (specialtyId: string) => {
    if (!editingDoctor || isSubmitting) return;
    
    setEditingDoctor({
      ...editingDoctor,
      specialtyIds: editingDoctor.specialtyIds.includes(specialtyId)
        ? editingDoctor.specialtyIds.filter(id => id !== specialtyId)
        : [...editingDoctor.specialtyIds, specialtyId]
    });
  };

  const openEditDialog = (doctor: typeof doctors[0]) => {
    if (isSubmitting) {
      toast.error('Espere a que termine la operación actual');
      return;
    }
    
    setEditingDoctor({
      id: doctor.id,
      name: doctor.name,
      specialtyIds: [...doctor.specialtyIds],
      paymentType: doctor.paymentType
    });
    setIsEditDialogOpen(true);
  };

  const handleAddDialogOpen = (open: boolean) => {
    if (isSubmitting) {
      toast.error('Espere a que termine la operación actual');
      return;
    }
    
    setIsAddDialogOpen(open);
    if (!open) {
      // Reset form when dialog closes
      setNewDoctor({ name: '', specialtyIds: [], paymentType: 'comision' });
    }
  };

  const handleEditDialogOpen = (open: boolean) => {
    if (isSubmitting) {
      toast.error('Espere a que termine la operación actual');
      return;
    }
    
    setIsEditDialogOpen(open);
    if (!open) {
      setEditingDoctor(null);
    }
  };

  const handleDeleteDialogOpen = (open: boolean) => {
    if (!open && isSubmitting) return;
    if (!open) {
      setDeleteConfirmId(null);
    }
  };

  // Estado deshabilitado para todos los controles durante envío
  const isDisabled = isSubmitting || loading;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Doctores</h1>
          <p className="text-muted-foreground">Gestione los doctores del centro médico</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={isDisabled}>
              <UserPlus className="h-4 w-4 mr-2" />
              Agregar Doctor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Doctor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={newDoctor.name}
                  onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                  placeholder="Nombre del doctor"
                  disabled={isDisabled}
                />
              </div>

              <div className="space-y-2">
                <Label>Especialidades</Label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-3">
                  {specialties.map(specialty => (
                    <div key={specialty.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`add-specialty-${specialty.id}`}
                        checked={newDoctor.specialtyIds.includes(specialty.id)}
                        onCheckedChange={() => toggleSpecialtyAdd(specialty.id)}
                        disabled={isDisabled}
                      />
                      <label
                        htmlFor={`add-specialty-${specialty.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {specialty.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Pago</Label>
                <RadioGroup 
                  value={newDoctor.paymentType} 
                  onValueChange={(value: 'comision' | 'sueldo') => setNewDoctor({ ...newDoctor, paymentType: value })}
                  disabled={isDisabled}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="comision" id="add-comision" />
                    <Label htmlFor="add-comision" className="font-normal cursor-pointer">Comisión</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sueldo" id="add-sueldo" />
                    <Label htmlFor="add-sueldo" className="font-normal cursor-pointer">Sueldo</Label>
                  </div>
                </RadioGroup>
              </div>

              <Button type="submit" className="w-full" disabled={isDisabled}>
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Agregando...
                  </div>
                ) : (
                  'Agregar Doctor'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No hay doctores registrados
            </div>
          ) : (
            doctors.map(doctor => {
              const isDoctorDeleting = deletingId === doctor.id;
              return (
                <Card key={doctor.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                      <span className="text-lg">{doctor.name}</span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(doctor)}
                          disabled={isDisabled}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmId(doctor.id)}
                          disabled={isDisabled}
                        >
                          {isDoctorDeleting ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive"></div>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Especialidades:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {doctor.specialtyIds.map(specialtyId => {
                            const specialty = specialties.find(s => s.id === specialtyId);
                            return specialty ? (
                              <span 
                                key={specialtyId} 
                                className="px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
                              >
                                {specialty.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Tipo de Pago:</p>
                        <span className={`px-2 py-1 rounded-md text-sm inline-block mt-1 ${
                          doctor.paymentType === 'comision' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {doctor.paymentType === 'comision' ? 'Comisión' : 'Sueldo'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Doctor</DialogTitle>
          </DialogHeader>
          {editingDoctor && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nombre</Label>
                <Input
                  id="edit-name"
                  value={editingDoctor.name}
                  onChange={(e) => setEditingDoctor({ ...editingDoctor, name: e.target.value })}
                  placeholder="Nombre del doctor"
                  disabled={isDisabled}
                />
              </div>

              <div className="space-y-2">
                <Label>Especialidades</Label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-3">
                  {specialties.map(specialty => (
                    <div key={specialty.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-specialty-${specialty.id}`}
                        checked={editingDoctor.specialtyIds.includes(specialty.id)}
                        onCheckedChange={() => toggleSpecialtyEdit(specialty.id)}
                        disabled={isDisabled}
                      />
                      <label
                        htmlFor={`edit-specialty-${specialty.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {specialty.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Pago</Label>
                <RadioGroup 
                  value={editingDoctor.paymentType} 
                  onValueChange={(value: 'comision' | 'sueldo') => setEditingDoctor({ ...editingDoctor, paymentType: value })}
                  disabled={isDisabled}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="comision" id="edit-comision" />
                    <Label htmlFor="edit-comision" className="font-normal cursor-pointer">Comisión</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sueldo" id="edit-sueldo" />
                    <Label htmlFor="edit-sueldo" className="font-normal cursor-pointer">Sueldo</Label>
                  </div>
                </RadioGroup>
              </div>

              <Button type="submit" className="w-full" disabled={isDisabled}>
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </div>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={handleDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente al doctor. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 relative"
            >
              {isSubmitting && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                </div>
              )}
              <span className={isSubmitting ? 'invisible' : 'visible'}>
                {isSubmitting ? 'Eliminando...' : 'Eliminar'}
              </span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}