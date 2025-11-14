import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getUsers, createUser, updateUser, deleteUser, User, UserRequest } from '@/api/UsersApi';

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'assistant' as 'admin' | 'assistant',
  });
  const [loading, setLoading] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await getUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  // Verificar si ya existe un usuario con el mismo nombre
  const checkDuplicateUser = (username: string, excludeId?: string): boolean => {
    const normalizedUsername = username.trim().toLowerCase();
    return users.some(user => 
      user.username.toLowerCase() === normalizedUsername && 
      user.id !== excludeId
    );
  };

  const validateForm = (): boolean => {
    if (!formData.username.trim()) {
      toast.error('El nombre de usuario es requerido');
      return false;
    }

    if (!editingUser && !formData.password) {
      toast.error('La contraseña es requerida para nuevos usuarios');
      return false;
    }

    if (formData.password && formData.password.length < 4) {
      toast.error('La contraseña debe tener al menos 4 caracteres');
      return false;
    }

    // Validar duplicados
    if (checkDuplicateUser(formData.username, editingUser?.id)) {
      toast.error('Ya existe un usuario con ese nombre');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formSubmitting) {
      toast.error('Por favor espere, se está procesando la solicitud');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setFormSubmitting(true);

    try {
      const userRequest: UserRequest = {
        username: formData.username.trim(),
        password: formData.password || undefined, // Enviar password solo si existe
        role: formData.role,
      };

      if (editingUser) {
        // Editar usuario
        await updateUser(editingUser.id, userRequest);
        toast.success('Usuario actualizado correctamente');
      } else {
        // Crear nuevo usuario - asegurar que hay password
        if (!userRequest.password) {
          toast.error('La contraseña es requerida para nuevos usuarios');
          return;
        }
        await createUser(userRequest);
        toast.success('Usuario creado correctamente');
      }

      await loadUsers();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar el usuario');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '', // No cargar la contraseña
      role: user.role,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (userId: string) => {
    setUserToDelete(userId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    if (deleteSubmitting) {
      toast.error('Por favor espere, se está procesando la eliminación');
      return;
    }

    setDeleteSubmitting(true);

    try {
      await deleteUser(userToDelete);
      toast.success('Usuario eliminado correctamente');
      await loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar el usuario');
    } finally {
      setDeleteSubmitting(false);
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleCloseDialog = () => {
    if (!formSubmitting) {
      setIsDialogOpen(false);
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        role: 'assistant',
      });
    }
  };

  const getRoleLabel = (role: string) => {
    return role === 'admin' ? 'Administrador' : 'Ayudante';
  };

  const isFormDisabled = formSubmitting || deleteSubmitting;
  const isActionDisabled = loading || formSubmitting || deleteSubmitting;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Usuarios</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los usuarios del sistema
          </p>
        </div>
        <Button 
          onClick={() => setIsDialogOpen(true)} 
          className="gap-2"
          disabled={isActionDisabled}
        >
          <Plus className="h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>{getRoleLabel(user.role)}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(user)}
                    disabled={isActionDisabled || user.id === '1'} // No permitir editar al admin principal si es necesario
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(user.id)}
                    disabled={isActionDisabled || user.id === '1'} // No permitir eliminar al admin principal
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Modifica los datos del usuario'
                : 'Completa los datos para crear un nuevo usuario'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nombre de Usuario</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                required
                disabled={isFormDisabled}
                placeholder="Ingrese el nombre de usuario"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Contraseña {editingUser && '(dejar vacío para mantener actual)'}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required={!editingUser}
                disabled={isFormDisabled}
                placeholder={editingUser ? "Nueva contraseña (opcional)" : "Ingrese la contraseña"}
                minLength={4}
              />
              {!editingUser && (
                <p className="text-xs text-muted-foreground">
                  La contraseña debe tener al menos 4 caracteres
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Tipo</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'admin' | 'assistant') =>
                  setFormData({ ...formData, role: value })
                }
                disabled={isFormDisabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="assistant">Ayudante</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCloseDialog}
                disabled={isFormDisabled}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={isFormDisabled}
              >
                {formSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                    {editingUser ? 'Guardando...' : 'Creando...'}
                  </>
                ) : (
                  editingUser ? 'Guardar Cambios' : 'Crear Usuario'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen && !deleteSubmitting) {
          setIsDeleteDialogOpen(false);
          setUserToDelete(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El usuario será eliminado permanentemente.
              {userToDelete === '1' && (
                <span className="text-destructive font-semibold block mt-2">
                  No se puede eliminar el usuario administrador principal.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubmitting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              disabled={deleteSubmitting || userToDelete === '1'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Users;