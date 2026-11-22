
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2 } from 'lucide-react';
import {
  getSpecialties,
  createSpecialty,
  updateSpecialty,
  deleteSpecialty
} from '@/api/SpecialtiesApi';
import type {
  Specialty,
  SpecialtyRequest
} from '@/api/SpecialtiesApi';

type FormService = {
  key: number;
  id?: string;
  name: string;
  price: string;
};

export default function Specialties() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [services, setServices] = useState<FormService[]>([]);
  const [serviceToDelete, setServiceToDelete] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Identificador interno para los campos del formulario
  const nextKey = useRef(0);

  // Identifica el nuevo servicio para resaltarlo y enfocarlo
  const [newServiceKey, setNewServiceKey] = useState<number | null>(null);
  const newServiceInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;

    getSpecialties()
      .then(data => {
        if (active) setSpecialties(data);
      })
      .catch(error => {
        if (active) {
          toast.error(error.message || 'Error al cargar especialidades');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Enfocar automáticamente el campo del nuevo servicio
  useEffect(() => {
    if (newServiceKey !== null && newServiceInputRef.current) {
      newServiceInputRef.current.focus();
      newServiceInputRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [newServiceKey]);

  const resetForm = () => {
    setName('');
    setServices([]);
    setEditingId(null);
    setServiceToDelete(null);
    setNewServiceKey(null);
    newServiceInputRef.current = null;
    setOpen(false);
  };

  const openCreate = () => {
    if (submitting) return;

    setEditingId(null);
    setName('');
    setServices([]);
    setNewServiceKey(null);
    setOpen(true);
  };

  const handleEdit = (specialty: Specialty) => {
    if (submitting) return;

    setEditingId(specialty.id);
    setName(specialty.name);
    setNewServiceKey(null);

    setServices(
      specialty.services.map(service => ({
        key: ++nextKey.current,
        id: service.id,
        name: service.name,
        price: service.price === undefined ? '' : String(service.price)
      }))
    );

    setOpen(true);
  };

  // Agregar el nuevo servicio AL INICIO de la lista
  const addService = () => {
    if (submitting) return;

    const key = ++nextKey.current;

    const newService: FormService = {
      key,
      name: '',
      price: ''
    };

    setServices(previous => [
      newService,
      ...previous
    ]);

    // Resaltar y enfocar el nuevo campo
    setNewServiceKey(key);
  };

  const changeService = (
    key: number,
    field: 'name' | 'price',
    value: string
  ) => {
    setServices(previous =>
      previous.map(service =>
        service.key === key
          ? { ...service, [field]: value }
          : service
      )
    );
  };

  const confirmRemoveService = () => {
    if (serviceToDelete === null) return;

    setServices(previous =>
      previous.filter(service => service.key !== serviceToDelete)
    );

    if (serviceToDelete === newServiceKey) {
      setNewServiceKey(null);
    }

    setServiceToDelete(null);

    toast.success(
      'Servicio retirado del formulario. Guarda para aplicar el cambio.'
    );
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (submitting) return;

    const trimmedName = name.trim();

    if (!trimmedName || trimmedName.length > 100) {
      toast.error(
        'Ingresa un nombre de especialidad válido (máximo 100 caracteres)'
      );
      return;
    }

    if (!services.length) {
      toast.error('Agrega al menos un servicio');
      return;
    }

    const hasInvalidService = services.some(service =>
      !service.name.trim() ||
      service.name.trim().length > 100 ||
      service.price.trim() === '' ||
      !Number.isFinite(Number(service.price)) ||
      Number(service.price) <= 0 ||
      Number(service.price) > 99999999.99 ||
      !/^\d+(\.\d{1,2})?$/.test(service.price)
    );

    if (hasInvalidService) {
      toast.error(
        'Todos los servicios deben tener nombre y precio válido (máximo dos decimales)'
      );
      return;
    }

    const payload: SpecialtyRequest = {
      nombre: trimmedName,
      servicios: services.map(service => ({
        id: service.id,
        nombre: service.name.trim(),
        precio: Number(service.price)
      }))
    };

    setSubmitting(true);

    try {
      if (editingId !== null) {
        const updated = await updateSpecialty(editingId, payload);

        setSpecialties(previous =>
          previous.map(item =>
            item.id === editingId ? updated : item
          )
        );

        toast.success('Especialidad actualizada correctamente');
      } else {
        const created = await createSpecialty(payload);

        setSpecialties(previous =>
          [...previous, created].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        );

        toast.success('Especialidad creada correctamente');
      }

      resetForm();
    } catch (error: any) {
      toast.error(
        error.message || 'No se pudo guardar la especialidad'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (deleteId === null || submitting) return;

    const id = deleteId;
    setSubmitting(true);

    try {
      await deleteSpecialty(id);

      setSpecialties(previous =>
        previous.filter(item => item.id !== id)
      );

      setDeleteId(null);

      toast.success('Especialidad eliminada correctamente');
    } catch (error: any) {
      toast.error(
        error.message || 'No se pudo eliminar la especialidad'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Especialidades
          </h1>

          <p className="text-sm md:text-base text-muted-foreground">
            Gestione las especialidades y servicios
          </p>
        </div>

        <Button
          type="button"
          className="w-full md:w-auto"
          disabled={submitting || loading}
          onClick={openCreate}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Especialidad
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          Cargando especialidades...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {specialties.map(specialty => (
            <Card key={specialty.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center gap-2">
                  <span className="break-words min-w-0">
                    {specialty.name}
                  </span>

                  <div className="flex gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar ${specialty.name}`}
                      onClick={() => handleEdit(specialty)}
                      disabled={submitting}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Eliminar ${specialty.name}`}
                      onClick={() => setDeleteId(specialty.id)}
                      disabled={submitting}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Servicios:
                </p>

                <ul className="space-y-1">
                  {specialty.services.map(service => (
                    <li key={service.id} className="text-sm">
                      • {service.name}
                      <span className="text-muted-foreground">
                        {' '} - Bs. {Number(service.price ?? 0).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={value => {
          if (!value && !submitting && serviceToDelete === null) {
            resetForm();
          }
        }}
      >
        <DialogContent
          className="max-w-2xl max-h-[80vh] overflow-y-auto"
          onInteractOutside={event => {
            if (submitting || serviceToDelete !== null) {
              event.preventDefault();
            }
          }}
          onEscapeKeyDown={event => {
            if (submitting || serviceToDelete !== null) {
              event.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {editingId !== null
                ? 'Editar Especialidad'
                : 'Crear Especialidad'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="specialty-name">
                Nombre de la Especialidad
              </Label>

              <Input
                id="specialty-name"
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="Ej: Odontología General"
                maxLength={100}
                disabled={submitting}
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center gap-2">
                <Label>Servicios</Label>

                <Button
                  type="button"
                  onClick={addService}
                  size="sm"
                  variant="secondary"
                  disabled={submitting}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Servicio
                </Button>
              </div>

              {services.map(service => {
                const isNewService = service.key === newServiceKey;

                return (
                  <div
                    key={service.key}
                    className={
                      isNewService
                        ? 'p-4 border-2 border-blue-500 rounded-lg space-y-3 bg-blue-50 dark:bg-blue-950/20 transition-colors'
                        : 'p-4 border rounded-lg space-y-3 bg-muted/30'
                    }
                  >
                    {isNewService && (
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm font-semibold">
                        <Plus className="h-4 w-4" />
                        Nuevo servicio
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Input
                        ref={
                          isNewService
                            ? newServiceInputRef
                            : undefined
                        }
                        aria-label="Nombre del servicio"
                        placeholder="Nombre del servicio"
                        value={service.name}
                        maxLength={100}
                        onChange={event =>
                          changeService(
                            service.key,
                            'name',
                            event.target.value
                          )
                        }
                        disabled={submitting}
                        className={
                          isNewService
                            ? 'bg-background border-blue-400 focus-visible:ring-blue-500'
                            : ''
                        }
                      />

                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        aria-label={`Quitar ${service.name || 'servicio'}`}
                        onClick={() => setServiceToDelete(service.key)}
                        disabled={submitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`service-price-${service.key}`}>
                        Precio (Bs.)
                      </Label>

                      <Input
                        id={`service-price-${service.key}`}
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="99999999.99"
                        placeholder="0.00"
                        value={service.price}
                        onChange={event =>
                          changeService(
                            service.key,
                            'price',
                            event.target.value
                          )
                        }
                        onWheel={event => event.currentTarget.blur()}
                        disabled={submitting}
                        className={
                          isNewService
                            ? 'bg-background border-blue-400 focus-visible:ring-blue-500'
                            : ''
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={submitting}
              >
                Cancelar
              </Button>

              <Button type="submit" disabled={submitting}>
                {submitting
                  ? 'Procesando...'
                  : editingId !== null
                    ? 'Actualizar Especialidad'
                    : 'Crear Especialidad'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={serviceToDelete !== null}
        onOpenChange={value => {
          if (!value && !submitting) {
            setServiceToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar servicio?
            </AlertDialogTitle>

            <AlertDialogDescription>
              El servicio se retirará del formulario.
              El cambio se aplicará cuando guardes la especialidad.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel
              type="button"
              disabled={submitting}
            >
              Cancelar
            </AlertDialogCancel>

            <AlertDialogAction
              type="button"
              onClick={confirmRemoveService}
              disabled={submitting}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={value => {
          if (!value && !submitting) {
            setDeleteId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar especialidad?
            </AlertDialogTitle>

            <AlertDialogDescription>
              La especialidad dejará de mostrarse.
              Sus servicios y registros históricos no serán eliminados.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel
              type="button"
              disabled={submitting}
            >
              Cancelar
            </AlertDialogCancel>

            <AlertDialogAction
              type="button"
              onClick={event => {
                event.preventDefault();
                void confirmDelete();
              }}
              disabled={submitting}
            >
              {submitting ? 'Procesando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
