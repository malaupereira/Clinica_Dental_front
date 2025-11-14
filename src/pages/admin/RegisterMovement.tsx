import { useState, useEffect } from 'react';
import { useApp, useAuth } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { getCashBoxes, createMovement, CashBox } from '@/api/MovementsApi';

export default function RegisterMovement() {
  const { transactions, addTransaction } = useApp();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAssistant = user?.tipo === 'assistant';
  
  const [cashBoxes, setCashBoxes] = useState<CashBox[]>([]);
  const [selectedCashBoxId, setSelectedCashBoxId] = useState<string>('1');
  const [movementType, setMovementType] = useState<'ingreso' | 'egreso'>('ingreso');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<{timestamp: number, data: any} | null>(null);

  // Mapeo de cajas frontend a backend
  const cashBoxMapping = {
    'clinic': 1,    // Caja Dental Studio
    'batas': 2,     // Caja Dr.Dress
    'clinic-qr': 3, // Caja Dental Studio QR
    'batas-qr': 4   // Caja Dr.Dress QR
  };

  const reverseCashBoxMapping = {
    1: 'clinic',
    2: 'batas', 
    3: 'clinic-qr',
    4: 'batas-qr'
  };

  useEffect(() => {
    loadCashBoxes();
  }, []);

  const loadCashBoxes = async () => {
    try {
      const boxes = await getCashBoxes();
      setCashBoxes(boxes);
    } catch (error) {
      console.error('Error loading cash boxes:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las cajas',
        variant: 'destructive',
      });
    }
  };

  const getCurrentBalance = () => {
    const selectedBox = cashBoxes.find(box => box.idcaja === parseInt(selectedCashBoxId));
    return selectedBox ? selectedBox.total : 0;
  };

  const getCashTypeName = (idcaja: number) => {
    const box = cashBoxes.find(b => b.idcaja === idcaja);
    return box ? box.nombre : '';
  };

  // Función para verificar si es un envío duplicado
  const isDuplicateSubmission = (currentData: any): boolean => {
    if (!lastSubmission) return false;
    
    // Verificar si el último envío fue hace menos de 5 segundos
    const timeDiff = Date.now() - lastSubmission.timestamp;
    if (timeDiff > 5000) return false; // No es duplicado si pasaron más de 5 segundos
    
    // Verificar si los datos son idénticos
    return (
      lastSubmission.data.idcaja === currentData.idcaja &&
      lastSubmission.data.monto === currentData.monto &&
      lastSubmission.data.tipo === currentData.tipo &&
      lastSubmission.data.descripcion === currentData.descripcion
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevenir múltiples envíos simultáneos
    if (isSubmitting) {
      toast({
        title: 'Espere',
        description: 'Ya se está procesando un movimiento',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Error',
        description: 'Usuario no autenticado',
        variant: 'destructive',
      });
      return;
    }

    // Validaciones básicas
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Error',
        description: 'El monto debe ser mayor a 0',
        variant: 'destructive',
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: 'Error',
        description: 'La descripción es obligatoria',
        variant: 'destructive',
      });
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmMovement = async () => {
    if (!user) return;

    // Bloquear inmediatamente para prevenir doble clic
    setIsSubmitting(true);
    setLoading(true);

    // Preparar datos del movimiento
    const movementData = {
      idcaja: parseInt(selectedCashBoxId),
      idusuario: user.idUsuario,
      monto: parseFloat(amount),
      tipo: movementType,
      descripcion: description.trim()
    };

    // Verificar duplicado antes de enviar
    if (isDuplicateSubmission(movementData)) {
      toast({
        title: 'Movimiento duplicado',
        description: 'Este movimiento ya fue registrado recientemente',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      setLoading(false);
      setShowConfirmDialog(false);
      return;
    }

    try {
      // Marcar el tiempo y datos del envío actual
      setLastSubmission({
        timestamp: Date.now(),
        data: movementData
      });

      // Crear movimiento en el backend
      const newMovement = await createMovement(movementData);

      // También agregar al contexto local para actualización inmediata en UI
      const frontendType = reverseCashBoxMapping[newMovement.idcaja as keyof typeof reverseCashBoxMapping];
      
      addTransaction({
        id: newMovement.idmovimiento_caja.toString(),
        type: frontendType as 'clinic' | 'batas' | 'clinic-qr' | 'batas-qr',
        amount: movementType === 'egreso' ? -parseFloat(amount) : parseFloat(amount),
        paymentMethod: movementType === 'egreso' ? 'Gasto' : 'Efectivo',
        details: description,
        date: newMovement.fecha,
        user: user.usuario
      });

      // Actualizar la lista de cajas
      await loadCashBoxes();

      toast({
        title: 'Movimiento registrado',
        description: `${movementType === 'egreso' ? 'Egreso' : 'Ingreso'} de Bs. ${amount} registrado correctamente`,
      });

      // Resetear formulario
      setAmount('');
      setDescription('');
      setShowConfirmDialog(false);
    } catch (error: any) {
      console.error('Error creating movement:', error);
      
      // Si es error de duplicado en el backend
      if (error.message?.includes('duplicad') || error.message?.includes('duplicate') || error.code === '23505') {
        toast({
          title: 'Movimiento duplicado',
          description: 'Este movimiento ya existe en la base de datos',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message || 'No se pudo registrar el movimiento',
          variant: 'destructive',
        });
      }
    } finally {
      // Liberar bloqueo después de un pequeño delay para prevenir ráfagas de clics
      setTimeout(() => {
        setIsSubmitting(false);
        setLoading(false);
      }, 1000);
    }
  };

  // Determinar si el botón debe estar deshabilitado
  const isButtonDisabled = loading || isSubmitting || !amount || parseFloat(amount) <= 0 || !description.trim();

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Registrar Movimiento</h1>
        <p className="text-sm md:text-base text-muted-foreground">Registre ingresos y egresos de caja</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground">Saldo Actual ({getCashTypeName(parseInt(selectedCashBoxId))})</p>
            <p className="text-4xl font-bold text-primary">Bs. {getCurrentBalance().toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo Movimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cashBox">Caja</Label>
                <Select value={selectedCashBoxId} onValueChange={setSelectedCashBoxId}>
                  <SelectTrigger id="cashBox">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cashBoxes.map((box) => (
                      <SelectItem 
                        key={box.idcaja} 
                        value={box.idcaja.toString()}
                        disabled={isAssistant && (box.idcaja === 3 || box.idcaja === 4)}
                      >
                        {box.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="movementType">Tipo de Movimiento</Label>
                <Select value={movementType} onValueChange={(value: 'ingreso' | 'egreso') => setMovementType(value)}>
                  <SelectTrigger id="movementType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ingreso">Ingreso</SelectItem>
                    <SelectItem value="egreso">Egreso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="amount">Monto (Bs.)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describa el motivo del movimiento..."
                required
                disabled={isSubmitting}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isButtonDisabled}
            >
              {isSubmitting || loading ? 'Registrando...' : `Registrar ${movementType === 'egreso' ? 'Egreso' : 'Ingreso'}`}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={(open) => !isSubmitting && setShowConfirmDialog(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar {movementType === 'egreso' ? 'Egreso' : 'Ingreso'}</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de registrar un {movementType} de Bs. {amount} en la caja de {getCashTypeName(parseInt(selectedCashBoxId))}?
              <br /><br />
              <strong>Descripción:</strong> {description}
              <br />
              <strong>Usuario:</strong> {user?.usuario}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmMovement} 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registrando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}