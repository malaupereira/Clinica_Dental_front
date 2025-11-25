import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { getSpecialties, createSpecialty, updateSpecialty, deleteSpecialty, SpecialtyRequest } from '@/api/SpecialtiesApi';

export default function Specialties() {
  const { specialties, addSpecialty, updateSpecialty: updateSpecialtyContext, deleteSpecialty: deleteSpecialtyContext } = useApp();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [services, setServices] = useState<Array<{ id?: string; name: string; price: number }>>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'create' | 'edit' | 'delete'>('create');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<number | null>(null);
  const [showServiceConfirmDialog, setShowServiceConfirmDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Cargar especialidades al montar el componente
  useEffect(() => {
    loadSpecialties();
  }, []);

  const loadSpecialties = async () => {
    try {
      setLoading(true);
      const fetchedSpecialties = await getSpecialties();
      // Actualizar el contexto con las especialidades de la base de datos
      fetchedSpecialties.forEach(specialty => {
        const exists = specialties.find(s => s.id === specialty.id);
        if (!exists) {
          addSpecialty(specialty);
        }
      });
    } catch (error) {
      console.error('Error loading specialties:', error);
      toast.error('Error al cargar las especialidades');
    } finally {
      setLoading(false);
    }
  };

  const addService = () => {
    if (submitting) return;
    setServices([...services, { name: '', price: 0 }]);
  };

  const removeService = (index: number) => {
    if (submitting) return;
    setServiceToDelete(index);
    setShowServiceConfirmDialog(true);
  };

  const confirmRemoveService = () => {
    if (serviceToDelete !== null) {
      const newServices = services.filter((_, i) => i !== serviceToDelete);
      setServices(newServices);
      setServiceToDelete(null);
      toast.success('Servicio eliminado del formulario');
    }
    setShowServiceConfirmDialog(false);
  };

  const updateService = (index: number, field: string, value: any) => {
    if (submitting) return;
    const newServices = [...services];
    newServices[index] = { ...newServices[index], [field]: value };
    setServices(newServices);
  };

  const handleEdit = (specialty: any) => {
    if (submitting) return;
    setEditingId(specialty.id);
    setName(specialty.name);
    // Incluir el ID de cada servicio para identificarlos
    setServices(specialty.services.map((s: any) => ({ 
      id: s.id, 
      name: s.name, 
      price: s.price || 0 
    })));
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (submitting) return;
    setDeleteId(id);
    setConfirmAction('delete');
    setShowConfirmDialog(true);
  };

  const resetForm = () => {
    setName('');
    setServices([]);
    setEditingId(null);
    setOpen(false);
    setServiceToDelete(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (submitting) {
      toast.error('Ya se está procesando una operación');
      return;
    }
    
    if (!name.trim() || services.length === 0) {
      toast.error('Complete todos los campos requeridos');
      return;
    }

    const hasEmptyService = services.some(s => !s.name.trim() || !s.price || s.price <= 0);
    if (hasEmptyService) {
      toast.error('Todos los servicios deben tener nombre y precio válido');
      return;
    }

    // Enviar directamente sin confirmación para crear/editar
    await confirmSubmit();
  };

  const confirmSubmit = async () => {
    if (submitting) {
      toast.error('Ya se está procesando una operación');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const specialtyRequest: SpecialtyRequest = {
        nombre: name,
        servicios: services.map(s => ({
          id: s.id, // Incluir el ID para identificar servicios existentes
          nombre: s.name,
          precio: Number(s.price)
        }))
      };

      if (editingId) {
        const updatedSpecialty = await updateSpecialty(editingId, specialtyRequest);
        updateSpecialtyContext(editingId, updatedSpecialty);
        toast.success('Especialidad actualizada exitosamente');
      } else {
        const newSpecialty = await createSpecialty(specialtyRequest);
        addSpecialty(newSpecialty);
        toast.success('Especialidad creada exitosamente');
      }
      
      resetForm();
    } catch (error: any) {
      console.error('Error saving specialty:', error);
      toast.error(error.message || 'Error al guardar la especialidad');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId || submitting) {
      toast.error('Ya se está procesando una operación');
      return;
    }
    
    setSubmitting(true);
    setDeletingId(deleteId);
    
    try {
      await deleteSpecialty(deleteId);
      deleteSpecialtyContext(deleteId);
      toast.success('Especialidad eliminada exitosamente');
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting specialty:', error);
      toast.error('Error al eliminar la especialidad');
    } finally {
      setSubmitting(false);
      setDeletingId(null);
      setShowConfirmDialog(false);
    }
  };

  // Estado deshabilitado para todos los controles durante envío
  const isDisabled = submitting || loading;

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
        <div className="flex justify-center items-center h-64">
          <p>Cargando especialidades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Especialidades</h1>
          <p className="text-sm md:text-base text-muted-foreground">Gestione las especialidades y servicios</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          if (submitting) return;
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto" disabled={isDisabled}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Especialidad
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Especialidad' : 'Crear Especialidad'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre de la Especialidad</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Odontología General"
                  disabled={isDisabled}
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Servicios</Label>
                  <Button 
                    type="button" 
                    onClick={addService} 
                    size="sm" 
                    variant="secondary"
                    disabled={isDisabled}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Servicio
                  </Button>
                </div>

                {services.map((service, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder="Nombre del servicio"
                          value={service.name}
                          onChange={(e) => updateService(index, 'name', e.target.value)}
                          disabled={isDisabled}
                        />
                      </div>
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="icon"
                        onClick={() => removeService(index)}
                        disabled={isDisabled}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label>Precio (Bs.)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={service.price === 0 ? '' : service.price}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Permitir vacío o números válidos
                          if (value === '') {
                            updateService(index, 'price', 0);
                          } else {
                            const numValue = parseFloat(value);
                            if (!isNaN(numValue) && numValue >= 0) {
                              updateService(index, 'price', numValue);
                            }
                          }
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                            e.preventDefault();
                          }
                        }}
                        className="no-spinner"
                        disabled={isDisabled}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                  disabled={isDisabled}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isDisabled}
                >
                  {submitting ? 'Procesando...' : (editingId ? 'Actualizar' : 'Crear')} Especialidad
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {specialties.map((specialty) => {
          const isDeleting = deletingId === specialty.id;
          return (
            <Card key={specialty.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {specialty.name}
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEdit(specialty)}
                      disabled={isDisabled}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(specialty.id)}
                      disabled={isDisabled}
                    >
                      {isDeleting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive"></div>
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Servicios:</p>
                  <ul className="space-y-1">
                    {specialty.services.map((service) => (
                      <li key={service.id} className="text-sm">
                        • {service.name} 
                        <span className="text-muted-foreground"> - Bs. {service.price}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alert Dialog para confirmar eliminación de especialidad (solo para eliminar) */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Desea eliminar esta especialidad? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={submitting}
              className="relative"
            >
              {submitting && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                </div>
              )}
              <span className={submitting ? 'invisible' : 'visible'}>
                {submitting ? 'Procesando...' : 'Confirmar'}
              </span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog para confirmar eliminación de servicio */}
      <AlertDialog open={showServiceConfirmDialog} onOpenChange={setShowServiceConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea eliminar este servicio del formulario? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRemoveService}
              disabled={submitting}
            >
              {submitting ? 'Procesando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style >{`
        /* Eliminar flechas/spinners en navegadores WebKit */
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        
        /* Eliminar flechas/spinners en Firefox */
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}