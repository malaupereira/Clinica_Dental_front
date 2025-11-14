import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Plus, CalendarIcon, FilterX, Edit, Trash2, DollarSign, ChevronDown, ChevronUp, Search, Eye } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getDoctors, createExpense, updateExpense, deleteExpense, payExpense, payCommissionGroup, ExpenseRequest, PaymentRequest, CommissionPaymentRequest } from '@/api/ExpensesApi';

const clinicExpenseTypes = ['Salarios', 'Pago Laboratorios', 'Pago Comisión Doctores', 'Compra de Insumos', 'Compra de Materiales de Limpieza', 'Alquiler', 'Compra Material de Escritorio', 'Internet', 'Luz', 'Celulares', 'Otros Gastos Clínica'];
const batasExpenseTypes = ['Envíos', 'Compra de Telas', 'Costura', 'Otros Gastos Batas'];

interface ExpenseFormData { 
  type: string; 
  doctor: string; 
  description: string; 
  amount: string; 
  clinicAmount: string; 
  clinicQrAmount: string; 
  batasAmount: string; 
  batasQrAmount: string; 
  status: 'pending' | 'completed'; 
}

interface PaymentFormData { 
  clinicAmount: string; 
  clinicQrAmount: string; 
  batasAmount: string; 
  batasQrAmount: string; 
}

interface Doctor {
  iddoctor: number;
  nombre: string;
}

export default function Expenses() {
  const { expenses, addExpense, updateExpense: updateExpenseContext, deleteExpense: deleteExpenseContext, transactions, refreshExpenses, refreshTransactions } = useApp();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [expenseToPay, setExpenseToPay] = useState<any>(null);
  const [editExpense, setEditExpense] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<'clinic' | 'batas'>('clinic');
  const [dateFilter, setDateFilter] = useState<'specific' | 'range' | 'currentMonth'>('currentMonth');
  const [specificDate, setSpecificDate] = useState<Date>();
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ 
    from: startOfMonth(new Date()), 
    to: endOfMonth(new Date()) 
  });
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);
  const [expandedCommission, setExpandedCommission] = useState<string | null>(null);
  const [editCommissionDialogOpen, setEditCommissionDialogOpen] = useState(false);
  const [commissionToEdit, setCommissionToEdit] = useState<any>(null);
  const [commissionEditAmount, setCommissionEditAmount] = useState<string>('');
  const [paymentData, setPaymentData] = useState<PaymentFormData>({ clinicAmount: '', clinicQrAmount: '', batasAmount: '', batasQrAmount: '' });
  const [formData, setFormData] = useState<ExpenseFormData>({ type: '', doctor: '', description: '', amount: '', clinicAmount: '', clinicQrAmount: '', batasAmount: '', batasQrAmount: '', status: 'pending' });
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<{timestamp: number, data: any} | null>(null);

  // Cargar doctores al montar el componente
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const doctorsData = await getDoctors();
        setDoctors(doctorsData);
      } catch (error) {
        console.error('Error loading doctors:', error);
        toast.error('Error al cargar los doctores');
      }
    };
    loadDoctors();
  }, []);

  // Cargar gastos con filtros aplicados
  useEffect(() => {
    const loadExpensesWithFilters = async () => {
      try {
        await refreshExpenses();
      } catch (error) {
        console.error('Error loading expenses:', error);
        toast.error('Error al cargar los gastos');
      }
    };
    loadExpensesWithFilters();
  }, [dateFilter, specificDate, dateRange]);

  const calculateBoxBalance = (boxType: string) => {
    return transactions
      .filter(t => t.type === boxType)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const clinicBalance = calculateBoxBalance('clinic');
  const clinicQrBalance = calculateBoxBalance('clinic-qr');
  const batasBalance = calculateBoxBalance('batas');
  const batasQrBalance = calculateBoxBalance('batas-qr');

  const getGroupedCommissions = () => {
    const commissionExpenses = expenses.filter(expense => 
      expense.type === 'Pago Comisión Doctores' && expense.status === 'pending'
    );
    const grouped: { [key: string]: { total: number; expenses: any[] } } = {};
    commissionExpenses.forEach(expense => {
      const doctor = expense.doctor;
      if (!grouped[doctor]) grouped[doctor] = { total: 0, expenses: [] };
      grouped[doctor].total += expense.amount;
      grouped[doctor].expenses.push(expense);
    });
    return grouped;
  };

  const groupedCommissions = getGroupedCommissions();
  const pendingExpenses = expenses.filter(expense => 
    expense.status === 'pending' && expense.type !== 'Pago Comisión Doctores'
  );
  const completedExpenses = expenses.filter(expense => expense.status === 'completed');
  const commissionExpenses = expenses.filter(expense => expense.type === 'Pago Comisión Doctores');

  const filterByDate = (date: string) => {
    const itemDate = new Date(date);
    
    if (dateFilter === 'currentMonth') {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      return itemDate >= start && itemDate <= end;
    }
    
    if (dateFilter === 'specific' && specificDate) {
      return itemDate.getDate() === specificDate.getDate() && 
             itemDate.getMonth() === specificDate.getMonth() && 
             itemDate.getFullYear() === specificDate.getFullYear();
    }
    
    if (dateFilter === 'range' && dateRange.from && dateRange.to) {
      return itemDate >= dateRange.from && itemDate <= dateRange.to;
    }
    
    return true;
  };

  const filterExpenses = (expenses: any[]) => expenses.filter(expense => {
    if (categoryFilter !== 'all' && (
      (categoryFilter === 'clinic' && expense.category !== 'clinic') || 
      (categoryFilter === 'batas' && expense.category !== 'batas')
    )) return false;
    
    if (typeFilter !== 'all' && expense.type !== typeFilter) return false;
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesType = expense.type.toLowerCase().includes(searchLower);
      const matchesDoctor = expense.doctor?.toLowerCase().includes(searchLower);
      const matchesDescription = expense.description?.toLowerCase().includes(searchLower);
      if (!matchesType && !matchesDoctor && !matchesDescription) return false;
    }
    
    return filterByDate(expense.createdDate || expense.date);
  }).sort((a, b) => new Date(b.createdDate || b.date).getTime() - new Date(a.createdDate || a.date).getTime());

  const filteredCompletedExpenses = filterExpenses(completedExpenses);
  const filteredPendingExpenses = filterExpenses(pendingExpenses);
  const totalCompletedExpenses = filteredCompletedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPendingExpenses = filteredPendingExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Función para verificar si es un envío duplicado
  const isDuplicateSubmission = (currentData: any): boolean => {
    if (!lastSubmission) return false;
    
    // Verificar si el último envío fue hace menos de 5 segundos
    const timeDiff = Date.now() - lastSubmission.timestamp;
    if (timeDiff > 5000) return false; // No es duplicado si pasaron más de 5 segundos
    
    // Verificar si los datos son idénticos
    return (
      lastSubmission.data.tipo === currentData.tipo &&
      lastSubmission.data.categoria === currentData.categoria &&
      lastSubmission.data.monto === currentData.monto &&
      lastSubmission.data.iddoctor === currentData.iddoctor
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevenir múltiples envíos simultáneos
    if (isSubmitting) {
      toast.error('Ya se está procesando un gasto. Espere...');
      return;
    }

    setLoading(true);
    setIsSubmitting(true);
    
    try {
      const amount = Number(formData.amount);

      if (!formData.type || !amount || amount <= 0) { 
        toast.error('Complete todos los campos requeridos'); 
        setLoading(false);
        setIsSubmitting(false);
        return; 
      }

      // Encontrar el ID del doctor seleccionado
      const selectedDoctor = doctors.find(d => d.nombre === formData.doctor);
      const iddoctor = selectedDoctor ? selectedDoctor.iddoctor : undefined;

      const expenseRequest: ExpenseRequest = {
        tipo: formData.type,
        categoria: selectedCategory,
        monto: amount,
        iddoctor: iddoctor,
        estado: editExpense?.status || 'pending'
      };

      // Verificar duplicado antes de enviar
      if (isDuplicateSubmission(expenseRequest)) {
        toast.error('Este gasto ya fue registrado recientemente');
        setLoading(false);
        setIsSubmitting(false);
        return;
      }

      // Marcar el tiempo y datos del envío actual
      setLastSubmission({
        timestamp: Date.now(),
        data: expenseRequest
      });

      if (editExpense) {
        // Actualizar gasto existente
        const updatedExpense = await updateExpense(editExpense.id, expenseRequest);
        updateExpenseContext(updatedExpense);
        toast.success('Gasto actualizado exitosamente');
      } else {
        // Crear nuevo gasto
        const newExpense = await createExpense(expenseRequest);
        addExpense(newExpense);
        toast.success('Gasto registrado exitosamente');
      }

      setOpen(false); 
      setEditExpense(null); 
      resetForm();
    } catch (error: any) {
      console.error('Error saving expense:', error);
      
      // Si es error de duplicado en el backend
      if (error.message?.includes('duplicad') || error.message?.includes('duplicate') || error.code === '23505') {
        toast.error('Este gasto ya existe en la base de datos');
      } else {
        toast.error(error.message || 'Error al guardar el gasto');
      }
    } finally {
      // Liberar bloqueo después de un pequeño delay para prevenir ráfagas de clics
      setTimeout(() => {
        setLoading(false);
        setIsSubmitting(false);
      }, 1000);
    }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseToPay) return;

    // Prevenir múltiples envíos simultáneos
    if (isSubmitting) {
      toast.error('Ya se está procesando un pago. Espere...');
      return;
    }

    setLoading(true);
    setIsSubmitting(true);

    try {
      const clinicAmount = Number(paymentData.clinicAmount) || 0;
      const clinicQrAmount = Number(paymentData.clinicQrAmount) || 0;
      const batasAmount = Number(paymentData.batasAmount) || 0;
      const batasQrAmount = Number(paymentData.batasQrAmount) || 0;
      const totalPayment = clinicAmount + clinicQrAmount + batasAmount + batasQrAmount;

      // Validaciones de categoría y montos
      if (expenseToPay.category === 'clinic') {
        if (clinicAmount === 0 && clinicQrAmount === 0) { 
          toast.error('Debe asignar al menos un monto a una caja para realizar el pago'); 
          setLoading(false);
          setIsSubmitting(false);
          return; 
        }
        if (batasAmount > 0 || batasQrAmount > 0) { 
          toast.error('Este gasto de Dental Studio no puede usar cajas de Dr.Dress'); 
          setLoading(false);
          setIsSubmitting(false);
          return; 
        }
      } else {
        if (batasAmount === 0 && batasQrAmount === 0) { 
          toast.error('Debe asignar al menos un monto a una caja para realizar el pago'); 
          setLoading(false);
          setIsSubmitting(false);
          return; 
        }
        if (clinicAmount > 0 || clinicQrAmount > 0) { 
          toast.error('Este gasto de Dr.Dress no puede usar cajas de Dental Studio'); 
          setLoading(false);
          setIsSubmitting(false);
          return; 
        }
      }

      // Validar que el pago total sea igual al monto del gasto
      if (!expenseToPay.isCommissionGroup && totalPayment !== expenseToPay.amount) { 
        toast.error(`Debe pagar el monto completo de Bs. ${expenseToPay.amount.toFixed(2)}`); 
        setLoading(false);
        setIsSubmitting(false);
        return; 
      }

      // Validar saldos suficientes
      if (expenseToPay.category === 'clinic') {
        if (clinicAmount > clinicBalance) { 
          toast.error(`No hay suficiente saldo en Caja Dental Studio. Saldo disponible: Bs. ${clinicBalance.toFixed(2)}`); 
          setLoading(false);
          setIsSubmitting(false);
          return; 
        }
        if (clinicQrAmount > clinicQrBalance) { 
          toast.error(`No hay suficiente saldo en Caja Dental Studio QR. Saldo disponible: Bs. ${clinicQrBalance.toFixed(2)}`); 
          setLoading(false);
          setIsSubmitting(false);
          return; 
        }
      } else {
        if (batasAmount > batasBalance) { 
          toast.error(`No hay suficiente saldo en Caja Dr.Dress. Saldo disponible: Bs. ${batasBalance.toFixed(2)}`); 
          setLoading(false);
          setIsSubmitting(false);
          return; 
        }
        if (batasQrAmount > batasQrBalance) { 
          toast.error(`No hay suficiente saldo en Caja Dr.Dress QR. Saldo disponible: Bs. ${batasQrBalance.toFixed(2)}`); 
          setLoading(false);
          setIsSubmitting(false);
          return; 
        }
      }

      if (expenseToPay.isCommissionGroup) {
        // Pago de comisiones agrupadas
        const selectedDoctor = doctors.find(d => d.nombre === expenseToPay.doctor);
        if (!selectedDoctor) {
          toast.error('No se pudo encontrar información del doctor');
          setLoading(false);
          setIsSubmitting(false);
          return;
        }

        const commissionPaymentRequest: CommissionPaymentRequest = {
          doctor: expenseToPay.doctor,
          iddoctor: selectedDoctor.iddoctor,
          clinicAmount,
          clinicQrAmount,
          batasAmount,
          batasQrAmount,
          idusuario: user?.idUsuario || 0
        };

        await payCommissionGroup(commissionPaymentRequest);
        toast.success(`Todas las comisiones de ${expenseToPay.doctor} han sido pagadas`);
      } else {
        // Pago normal de gasto
        const paymentRequest: PaymentRequest = {
          idgasto: parseInt(expenseToPay.id),
          clinicAmount,
          clinicQrAmount,
          batasAmount,
          batasQrAmount,
          idusuario: user?.idUsuario || 0
        };

        await payExpense(paymentRequest);
        toast.success('Gasto pagado completamente');
      }

      // Recargar datos
      await Promise.all([refreshExpenses(), refreshTransactions()]);
      
    } catch (error: any) {
      console.error('Error processing payment:', error);
      
      // Si es error de duplicado en el backend
      if (error.message?.includes('duplicad') || error.message?.includes('duplicate') || error.code === '23505') {
        toast.error('Este pago ya fue procesado anteriormente');
      } else {
        toast.error(error.message || 'Error al procesar el pago');
      }
    } finally {
      // Liberar bloqueo después de un pequeño delay para prevenir ráfagas de clics
      setTimeout(() => {
        setLoading(false);
        setIsSubmitting(false);
        setPayDialogOpen(false); 
        setExpenseToPay(null); 
        setPaymentData({ clinicAmount: '', clinicQrAmount: '', batasAmount: '', batasQrAmount: '' });
      }, 1000);
    }
  };

  const handlePaySingleCommission = (commission: any) => { 
    setExpenseToPay(commission); 
    setPaymentData({ 
      clinicAmount: commission.category === 'clinic' ? commission.amount.toString() : '', 
      clinicQrAmount: '', 
      batasAmount: commission.category === 'batas' ? commission.amount.toString() : '', 
      batasQrAmount: '' 
    }); 
    setPayDialogOpen(true); 
  };

  const handlePayCommission = (doctor: string, totalAmount: number) => { 
    setExpenseToPay({ 
      id: `commission-${doctor}-${Date.now()}`, 
      type: 'Pago Comisión Doctores', 
      doctor, 
      description: `Pago de comisiones agrupadas - ${doctor}`, 
      amount: totalAmount, 
      category: 'clinic', 
      clinicAmount: 0, 
      clinicQrAmount: 0, 
      batasAmount: 0, 
      batasQrAmount: 0, 
      status: 'pending', 
      createdDate: new Date().toISOString(), 
      date: new Date().toISOString(), 
      isCommissionGroup: true 
    }); 
    setPaymentData({ clinicAmount: totalAmount.toString(), clinicQrAmount: '', batasAmount: '', batasQrAmount: '' }); 
    setPayDialogOpen(true); 
  };

  const resetForm = () => { 
    setFormData({ type: '', doctor: '', description: '', amount: '', clinicAmount: '', clinicQrAmount: '', batasAmount: '', batasQrAmount: '', status: 'pending' }); 
    setSelectedCategory('clinic'); 
  };

  const handleEdit = (expense: any) => { 
    setEditExpense(expense); 
    setSelectedCategory(expense.category || 'clinic'); 
    setFormData({ 
      type: expense.type, 
      doctor: expense.doctor || '', 
      description: expense.description || '', 
      amount: expense.amount.toString(), 
      clinicAmount: expense.clinicAmount?.toString() || '', 
      clinicQrAmount: expense.clinicQrAmount?.toString() || '', 
      batasAmount: expense.batasAmount?.toString() || '', 
      batasQrAmount: expense.batasQrAmount?.toString() || '', 
      status: expense.status || 'pending' 
    }); 
    setOpen(true); 
  };

  const handlePay = (expense: any) => { 
    setExpenseToPay(expense); 
    setPaymentData({ 
      clinicAmount: expense.category === 'clinic' ? expense.amount.toString() : '', 
      clinicQrAmount: '', 
      batasAmount: expense.category === 'batas' ? expense.amount.toString() : '', 
      batasQrAmount: '' 
    }); 
    setPayDialogOpen(true); 
  };

  const handleEditCommission = (commission: any) => { 
    setCommissionToEdit(commission); 
    setCommissionEditAmount(commission.amount.toString()); 
    setEditCommissionDialogOpen(true); 
  };

  const handleSaveCommissionEdit = async () => { 
    if (!commissionToEdit) return;

    // Prevenir múltiples envíos simultáneos
    if (isSubmitting) {
      toast.error('Ya se está procesando una edición. Espere...');
      return;
    }

    setLoading(true);
    setIsSubmitting(true);

    try {
      const newAmount = Number(commissionEditAmount);
      if (newAmount <= 0) { 
        toast.error('El monto debe ser mayor a 0'); 
        setLoading(false);
        setIsSubmitting(false);
        return; 
      }

      const selectedDoctor = doctors.find(d => d.nombre === commissionToEdit.doctor);
      const iddoctor = selectedDoctor ? selectedDoctor.iddoctor : undefined;

      const expenseRequest: ExpenseRequest = {
        tipo: commissionToEdit.type,
        categoria: commissionToEdit.category,
        monto: newAmount,
        iddoctor: iddoctor,
        estado: commissionToEdit.status
      };

      const updatedExpense = await updateExpense(commissionToEdit.id, expenseRequest);
      updateExpenseContext(updatedExpense);
      toast.success('Comisión actualizada exitosamente');
      setEditCommissionDialogOpen(false); 
      setCommissionToEdit(null); 
      setCommissionEditAmount('');
    } catch (error: any) {
      console.error('Error updating commission:', error);
      
      // Si es error de duplicado en el backend
      if (error.message?.includes('duplicad') || error.message?.includes('duplicate') || error.code === '23505') {
        toast.error('Esta comisión ya fue modificada anteriormente');
      } else {
        toast.error(error.message || 'Error al actualizar la comisión');
      }
    } finally {
      // Liberar bloqueo después de un pequeño delay para prevenir ráfagas de clics
      setTimeout(() => {
        setLoading(false);
        setIsSubmitting(false);
      }, 1000);
    }
  };

  const handleDelete = (expense: any) => { 
    setExpenseToDelete(expense); 
    setDeleteDialogOpen(true); 
  };

  const confirmDelete = async () => { 
    if (expenseToDelete) { 
      // Prevenir múltiples envíos simultáneos
      if (isSubmitting) {
        toast.error('Ya se está procesando una eliminación. Espere...');
        return;
      }

      setLoading(true);
      setIsSubmitting(true);
      
      try {
        await deleteExpense(expenseToDelete.id);
        deleteExpenseContext(expenseToDelete.id);
        toast.success('Gasto eliminado exitosamente');
      } catch (error: any) {
        console.error('Error deleting expense:', error);
        toast.error(error.message || 'Error al eliminar el gasto');
      } finally {
        // Liberar bloqueo después de un pequeño delay para prevenir ráfagas de clics
        setTimeout(() => {
          setLoading(false);
          setIsSubmitting(false);
          setDeleteDialogOpen(false); 
          setExpenseToDelete(null); 
        }, 1000);
      }
    } 
  };

  const clearFilters = () => { 
    setDateFilter('currentMonth');
    setSpecificDate(undefined); 
    setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }); 
    setTypeFilter('all'); 
    setCategoryFilter('all'); 
    setSearchTerm(''); 
  };

  const hasActiveFilters = dateFilter !== 'currentMonth' || specificDate || 
    (dateRange.from && dateRange.to && (
      dateRange.from.getTime() !== startOfMonth(new Date()).getTime() || 
      dateRange.to.getTime() !== endOfMonth(new Date()).getTime()
    )) || 
    typeFilter !== 'all' || categoryFilter !== 'all' || searchTerm;

  const currentExpenseTypes = selectedCategory === 'clinic' ? clinicExpenseTypes : batasExpenseTypes;
  const allExpenseTypes = [...clinicExpenseTypes, ...batasExpenseTypes];
  const showDescriptionField = formData.type === 'Otros Gastos Clínica' || formData.type === 'Otros Gastos Batas';
  
  const getStatusBadge = (expense: any) => 
    expense.status === 'completed' ? 
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">Completado</Badge> : 
      <Badge variant="secondary" className="text-xs">Pendiente</Badge>;
  
  const getRemainingAmount = (expense: any) => expense.amount - (expense.paidAmount || 0);

  // Determinar si los botones deben estar deshabilitados
  const isButtonDisabled = loading || isSubmitting;
  const isFormDisabled = isButtonDisabled || !formData.type || !formData.amount || Number(formData.amount) <= 0;

  const renderExpenseRow = (expense: any, isCompleted = false) => (
    <TableRow key={expense.id}>
      <TableCell className="py-2">
        <div className="text-sm">{format(new Date(expense.createdDate || expense.date), 'dd/MM/yyyy')}</div>
        <div className="text-xs text-muted-foreground">{format(new Date(expense.createdDate || expense.date), 'HH:mm')}</div>
      </TableCell>
      <TableCell className="py-2">
        <Badge variant="outline" className="text-xs">
          {expense.category === 'clinic' ? 'Dental Studio' : 'Dr.Dress'}
        </Badge>
      </TableCell>
      <TableCell className="py-2">
        <div className="font-medium text-sm">{expense.type}</div>
      </TableCell>
      <TableCell className="py-2 text-sm">{expense.doctor || 'NA'}</TableCell>
      <TableCell className="py-2 font-bold text-destructive text-sm">Bs. {expense.amount.toFixed(2)}</TableCell>
      <TableCell className="py-2">{getStatusBadge(expense)}</TableCell>
      <TableCell className="py-2 text-right">
        <div className="flex justify-end gap-1">
          {!isCompleted && (
            <Button size="sm" variant="outline" onClick={() => handlePay(expense)} className="h-7 w-7 p-0" title="Pagar gasto" disabled={isButtonDisabled}>
              <DollarSign className="h-3 w-3 text-green-600" />
            </Button>
          )}
          {!isCompleted && (
            <Button size="sm" variant="outline" onClick={() => handleEdit(expense)} className="h-7 w-7 p-0" title="Editar gasto" disabled={isButtonDisabled}>
              <Edit className="h-3 w-3" />
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => handleDelete(expense)} className="h-7 w-7 p-0 text-destructive" title="Eliminar gasto" disabled={isButtonDisabled}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  const renderMobileExpenseCard = (expense: any, isCompleted = false) => (
    <Collapsible key={expense.id} open={expandedExpense === expense.id} onOpenChange={() => setExpandedExpense(expandedExpense === expense.id ? null : expense.id)} className="border rounded-lg">
      <div className="p-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {expense.category === 'clinic' ? 'Dental Studio' : 'Dr.Dress'}
              </Badge>
              {getStatusBadge(expense)}
            </div>
            <h3 className="font-medium text-sm truncate" title={expense.type}>{expense.type}</h3>
            <div className="mt-1">
              <span className="text-xs text-muted-foreground">
                {format(new Date(expense.createdDate || expense.date), 'dd/MM/yy')}
              </span>
            </div>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="ml-2" disabled={isButtonDisabled}>
              {expandedExpense === expense.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>
        <div className="mt-2">
          <p className="text-sm font-bold text-destructive">Bs. {expense.amount.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">Doctor: {expense.doctor || 'NA'}</p>
        </div>
      </div>
      <CollapsibleContent className="px-3 pb-3 border-t">
        <div className="grid grid-cols-2 gap-3 text-xs mt-2">
          <div>
            <span className="text-muted-foreground">Fecha completa:</span>
            <p className="font-medium">{format(new Date(expense.createdDate || expense.date), 'dd/MM/yyyy HH:mm')}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Categoría:</span>
            <p className="font-medium">{expense.category === 'clinic' ? 'Dental Studio' : 'Dr.Dress'}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          {!isCompleted && (
            <Button size="sm" variant="outline" onClick={() => handlePay(expense)} className="flex-1 text-xs h-8" disabled={isButtonDisabled}>
              <DollarSign className="h-3 w-3 mr-1" />Pagar
            </Button>
          )}
          {!isCompleted && (
            <Button size="sm" variant="outline" onClick={() => handleEdit(expense)} className="flex-1 text-xs h-8" disabled={isButtonDisabled}>
              <Edit className="h-3 w-3 mr-1" />Editar
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => handleDelete(expense)} className="flex-1 text-xs h-8 text-destructive" disabled={isButtonDisabled}>
            <Trash2 className="h-3 w-3 mr-1" />Eliminar
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <div className="container mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Gastos</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Registre y gestione los gastos del negocio</p>
        </div>
        <Dialog open={open} onOpenChange={(open) => { 
          if (!isButtonDisabled) {
            setOpen(open); 
            if (!open) { 
              setEditExpense(null); 
              resetForm(); 
            } 
          }
        }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto text-sm sm:text-base" disabled={isButtonDisabled}>
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />Nuevo Gasto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">{editExpense ? 'Editar Gasto' : 'Registrar Gasto'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label className="text-sm sm:text-base">Categoría *</Label>
                  <Select value={selectedCategory} onValueChange={(value: 'clinic' | 'batas') => setSelectedCategory(value)} disabled={!!editExpense || isButtonDisabled}>
                    <SelectTrigger className="text-sm sm:text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clinic">Dental Studio</SelectItem>
                      <SelectItem value="batas">Dr.Dress</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm sm:text-base">Tipo de Gasto *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })} disabled={isButtonDisabled}>
                    <SelectTrigger className="text-sm sm:text-base">
                      <SelectValue placeholder="Seleccione tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentExpenseTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(formData.type === 'Salarios' || formData.type === 'Pago Comisión Doctores') && (
                <div className="space-y-2">
                  <Label className="text-sm sm:text-base">Doctor</Label>
                  <Select value={formData.doctor} onValueChange={(value) => setFormData({ ...formData, doctor: value })} disabled={isButtonDisabled}>
                    <SelectTrigger className="text-sm sm:text-base">
                      <SelectValue placeholder="Seleccione doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map(doctor => (
                        <SelectItem key={doctor.iddoctor} value={doctor.nombre}>{doctor.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {showDescriptionField && (
                <div className="space-y-2">
                  <Label className="text-sm sm:text-base">Descripción *</Label>
                  <Input 
                    value={formData.description} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                    placeholder="Descripción del gasto" 
                    className="text-sm sm:text-base" 
                    required 
                    disabled={isButtonDisabled}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-sm sm:text-base">Monto Total (Bs.) *</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={formData.amount} 
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })} 
                  placeholder="Ingrese el monto total" 
                  className="text-sm sm:text-base" 
                  required 
                  disabled={isButtonDisabled}
                />
                {editExpense?.paidAmount && (
                  <p className="text-xs text-muted-foreground">
                    Ya pagado: Bs. {editExpense.paidAmount.toFixed(2)} - Mínimo permitido: Bs. {editExpense.paidAmount.toFixed(2)}
                  </p>
                )}
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-3 sm:pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto text-sm sm:text-base" disabled={isButtonDisabled}>
                  Cancelar
                </Button>
                <Button type="submit" className="w-full sm:w-auto text-sm sm:text-base" disabled={isFormDisabled}>
                  {isButtonDisabled ? 'Procesando...' : (editExpense ? 'Actualizar Gasto' : 'Registrar Gasto')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="lg:col-span-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por tipo, doctor..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-8 text-sm" 
              disabled={isButtonDisabled}
            />
          </div>
        </div>
        <div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={isButtonDisabled}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              <SelectItem value="clinic">Dental Studio</SelectItem>
              <SelectItem value="batas">Dr.Dress</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select value={typeFilter} onValueChange={setTypeFilter} disabled={isButtonDisabled}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {allExpenseTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={clearFilters} className="w-full sm:w-auto text-sm" disabled={isButtonDisabled}>
            <FilterX className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />Limpiar Filtros
          </Button>
        </div>
      )}

      {Object.keys(groupedCommissions).length > 0 && (
        <Card>
          <CardHeader className="pb-3 p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg md:text-xl">Comisiones por Doctor</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-2 md:p-6">
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-sm">Doctor</TableHead>
                    <TableHead className="text-sm">Total Pendiente</TableHead>
                    <TableHead className="text-sm">N° de Comisiones</TableHead>
                    <TableHead className="text-sm text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(groupedCommissions).map(([doctor, data]) => (
                    <React.Fragment key={doctor}>
                      <TableRow>
                        <TableCell className="py-2 font-medium">{doctor}</TableCell>
                        <TableCell className="py-2 font-bold text-destructive">Bs. {data.total.toFixed(2)}</TableCell>
                        <TableCell className="py-2 text-sm">{data.expenses.length} comisión(es)</TableCell>
                        <TableCell className="py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" onClick={() => handlePayCommission(doctor, data.total)} className="h-7 text-xs" disabled={isButtonDisabled}>
                              <DollarSign className="h-3 w-3 mr-1" />Pagar Todo
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setExpandedCommission(expandedCommission === doctor ? null : doctor)} className="h-7 text-xs" disabled={isButtonDisabled}>
                              <Eye className="h-3 w-3 mr-1" />Ver Detalle
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedCommission === doctor && (
                        <TableRow>
                          <TableCell colSpan={4} className="bg-muted/50 p-4">
                            <div className="space-y-3">
                              <div className="font-medium text-sm">Detalle de comisiones - {doctor}</div>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">Fecha</TableHead>
                                    <TableHead className="text-xs">Monto</TableHead>
                                    <TableHead className="text-xs">Estado</TableHead>
                                    <TableHead className="text-xs text-right">Acciones</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {data.expenses.map((expense) => (
                                    <TableRow key={expense.id}>
                                      <TableCell className="py-2 text-xs">
                                        {format(new Date(expense.createdDate || expense.date), 'dd/MM/yyyy')}
                                      </TableCell>
                                      <TableCell className="py-2 text-xs font-medium">Bs. {expense.amount.toFixed(2)}</TableCell>
                                      <TableCell className="py-2">{getStatusBadge(expense)}</TableCell>
                                      <TableCell className="py-2 text-right">
                                        <div className="flex justify-end gap-1">
                                          <Button size="sm" onClick={() => handlePaySingleCommission(expense)} className="h-6 text-xs" disabled={isButtonDisabled}>
                                            <DollarSign className="h-3 w-3 mr-1" />Pagar
                                          </Button>
                                          <Button size="sm" variant="outline" onClick={() => handleEditCommission(expense)} className="h-6 w-6 p-0" title="Editar comisión" disabled={isButtonDisabled}>
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                          <Button size="sm" variant="outline" onClick={() => handleDelete(expense)} className="h-6 w-6 p-0 text-destructive" title="Eliminar comisión" disabled={isButtonDisabled}>
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="sm:hidden space-y-2 p-2">
              {Object.entries(groupedCommissions).map(([doctor, data]) => (
                <div key={doctor} className="border rounded-lg">
                  <div className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-sm">{doctor}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{data.expenses.length} comisión(es)</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => handlePayCommission(doctor, data.total)} className="h-7 text-xs" disabled={isButtonDisabled}>
                          <DollarSign className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setExpandedCommission(expandedCommission === doctor ? null : doctor)} className="h-7 text-xs" disabled={isButtonDisabled}>
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-destructive mt-2">Bs. {data.total.toFixed(2)}</p>
                  </div>
                  {expandedCommission === doctor && (
                    <div className="border-t p-3">
                      <div className="font-medium text-sm mb-2">Detalle de comisiones</div>
                      <div className="space-y-2">
                        {data.expenses.map((expense) => (
                          <div key={expense.id} className="flex justify-between items-center border rounded p-2">
                            <div>
                              <div className="text-xs">{format(new Date(expense.createdDate || expense.date), 'dd/MM/yyyy')}</div>
                              <div className="text-sm font-medium">Bs. {expense.amount.toFixed(2)}</div>
                              {getStatusBadge(expense)}
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" onClick={() => handlePaySingleCommission(expense)} className="h-6 text-xs" disabled={isButtonDisabled}>
                                <DollarSign className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleEditCommission(expense)} className="h-6 w-6 p-0" disabled={isButtonDisabled}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleDelete(expense)} className="h-6 w-6 p-0 text-destructive" disabled={isButtonDisabled}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {filteredPendingExpenses.length > 0 && (
        <Card>
          <CardHeader className="pb-3 p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg md:text-xl">Gastos Pendientes</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-2 md:p-6">
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-sm min-w-[100px]">Fecha</TableHead>
                    <TableHead className="text-sm min-w-[120px]">Categoría</TableHead>
                    <TableHead className="text-sm min-w-[150px]">Tipo</TableHead>
                    <TableHead className="text-sm min-w-[120px]">Doctor</TableHead>
                    <TableHead className="text-sm min-w-[100px]">Monto</TableHead>
                    <TableHead className="text-sm min-w-[100px]">Estado</TableHead>
                    <TableHead className="text-sm min-w-[120px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPendingExpenses.map((expense) => renderExpenseRow(expense))}
                </TableBody>
              </Table>
            </div>
            <div className="sm:hidden space-y-2 p-2">
              {filteredPendingExpenses.map((expense) => renderMobileExpenseCard(expense))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base sm:text-lg md:text-xl">
              Historial de Gastos Completados
              {hasActiveFilters && (
                <span className="text-xs sm:text-sm font-normal text-muted-foreground ml-2">
                  ({filteredCompletedExpenses.length} resultados)
                </span>
              )}
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={dateFilter} onValueChange={(value: 'specific' | 'range' | 'currentMonth') => setDateFilter(value)} disabled={isButtonDisabled}>
                <SelectTrigger className="text-sm w-full sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="currentMonth">Mes actual</SelectItem>
                  <SelectItem value="specific">Día específico</SelectItem>
                  <SelectItem value="range">Rango de fechas</SelectItem>
                </SelectContent>
              </Select>
              {dateFilter === 'specific' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full sm:w-[140px] justify-start text-left font-normal text-sm", !specificDate && "text-muted-foreground")} disabled={isButtonDisabled}>
                      <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      {specificDate ? format(specificDate, "dd/MM/yy") : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={specificDate} onSelect={setSpecificDate} initialFocus locale={es} />
                  </PopoverContent>
                </Popover>
              )}
              {dateFilter === 'range' && (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full sm:w-[140px] justify-start text-left font-normal text-sm", !dateRange.from && "text-muted-foreground")} disabled={isButtonDisabled}>
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {dateRange.from ? format(dateRange.from, "dd/MM/yy") : "Desde"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={dateRange.from} onSelect={(date) => setDateRange({ ...dateRange, from: date })} initialFocus locale={es} />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full sm:w-[140px] justify-start text-left font-normal text-sm", !dateRange.to && "text-muted-foreground")} disabled={isButtonDisabled}>
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {dateRange.to ? format(dateRange.to, "dd/MM/yy") : "Hasta"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar 
                        mode="single" 
                        selected={dateRange.to} 
                        onSelect={(date) => setDateRange({ ...dateRange, to: date })} 
                        initialFocus 
                        locale={es} 
                        disabled={(date) => dateRange.from ? date < dateRange.from : false} 
                      />
                    </PopoverContent>
                  </Popover>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-2 md:p-6">
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm min-w-[100px]">Fecha</TableHead>
                  <TableHead className="text-sm min-w-[120px]">Categoría</TableHead>
                  <TableHead className="text-sm min-w-[150px]">Tipo</TableHead>
                  <TableHead className="text-sm min-w-[120px]">Doctor</TableHead>
                  <TableHead className="text-sm min-w-[100px]">Monto</TableHead>
                  <TableHead className="text-sm min-w-[100px]">Estado</TableHead>
                  <TableHead className="text-sm min-w-[80px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompletedExpenses.map((expense) => renderExpenseRow(expense, true))}
                {filteredCompletedExpenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-8">
                      No hay gastos completados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="sm:hidden space-y-2 p-2">
            {filteredCompletedExpenses.map((expense) => (
              <div key={expense.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {expense.category === 'clinic' ? 'Dental Studio' : 'Dr.Dress'}
                      </Badge>
                      {getStatusBadge(expense)}
                    </div>
                    <h3 className="font-medium text-sm truncate" title={expense.type}>{expense.type}</h3>
                    <div className="mt-1">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(expense.createdDate || expense.date), 'dd/MM/yy')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm font-bold text-destructive">Bs. {expense.amount.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Doctor: {expense.doctor || 'NA'}</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => handleDelete(expense)} className="text-xs h-8 text-destructive" disabled={isButtonDisabled}>
                    <Trash2 className="h-3 w-3 mr-1" />Eliminar
                  </Button>
                </div>
              </div>
            ))}
            {filteredCompletedExpenses.length === 0 && (
              <div className="text-center text-muted-foreground py-8 text-sm">No hay gastos completados</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={payDialogOpen} onOpenChange={(open) => !isButtonDisabled && setPayDialogOpen(open)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Pagar {expenseToPay?.isCommissionGroup ? 'Comisiones Agrupadas' : 'Gasto'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaySubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm sm:text-base"><strong>Tipo:</strong> {expenseToPay?.type}</p>
                <p className="text-sm sm:text-base"><strong>Monto total:</strong> Bs. {expenseToPay?.amount?.toFixed(2)}</p>
                {expenseToPay?.doctor && <p className="text-sm sm:text-base"><strong>Doctor:</strong> {expenseToPay.doctor}</p>}
                {expenseToPay?.isCommissionGroup && (
                  <p className="text-sm text-blue-600 font-medium">Se pagarán todas las comisiones pendientes de este doctor</p>
                )}
              </div>
              <Label className="text-sm sm:text-base">Distribución del Pago *</Label>
              <div className="grid grid-cols-1 gap-3">
                {expenseToPay?.category === 'clinic' ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Caja Dental Studio (Saldo: Bs. {clinicBalance.toFixed(2)})</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={paymentData.clinicAmount} 
                        onChange={(e) => setPaymentData({ ...paymentData, clinicAmount: e.target.value })} 
                        placeholder="0.00" 
                        className="text-sm sm:text-base" 
                        disabled={isButtonDisabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Caja Dental Studio QR (Saldo: Bs. {clinicQrBalance.toFixed(2)})</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={paymentData.clinicQrAmount} 
                        onChange={(e) => setPaymentData({ ...paymentData, clinicQrAmount: e.target.value })} 
                        placeholder="0.00" 
                        className="text-sm sm:text-base" 
                        disabled={isButtonDisabled}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Caja Dr.Dress (Saldo: Bs. {batasBalance.toFixed(2)})</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={paymentData.batasAmount} 
                        onChange={(e) => setPaymentData({ ...paymentData, batasAmount: e.target.value })} 
                        placeholder="0.00" 
                        className="text-sm sm:text-base" 
                        disabled={isButtonDisabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Caja Dr.Dress QR (Saldo: Bs. {batasQrBalance.toFixed(2)})</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={paymentData.batasQrAmount} 
                        onChange={(e) => setPaymentData({ ...paymentData, batasQrAmount: e.target.value })} 
                        placeholder="0.00" 
                        className="text-sm sm:text-base" 
                        disabled={isButtonDisabled}
                      />
                    </div>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Puede distribuir el pago entre las cajas disponibles. La suma debe ser igual al monto total.
              </p>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setPayDialogOpen(false)} className="w-full sm:w-auto text-sm sm:text-base" disabled={isButtonDisabled}>
                Cancelar
              </Button>
              <Button type="submit" className="w-full sm:w-auto text-sm sm:text-base" disabled={isButtonDisabled}>
                {isButtonDisabled ? 'Procesando...' : (expenseToPay?.isCommissionGroup ? 'Pagar Todas las Comisiones' : 'Confirmar Pago')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editCommissionDialogOpen} onOpenChange={(open) => !isButtonDisabled && setEditCommissionDialogOpen(open)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Editar Comisión</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm sm:text-base"><strong>Doctor:</strong> {commissionToEdit?.doctor}</p>
              <p className="text-sm sm:text-base">
                <strong>Fecha:</strong> {commissionToEdit ? format(new Date(commissionToEdit.createdDate || commissionToEdit.date), 'dd/MM/yyyy') : ''}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Monto (Bs.) *</Label>
              <Input 
                type="number" 
                step="0.01" 
                value={commissionEditAmount} 
                onChange={(e) => setCommissionEditAmount(e.target.value)} 
                placeholder="Ingrese el monto" 
                className="text-sm sm:text-base" 
                disabled={isButtonDisabled}
              />
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditCommissionDialogOpen(false)} className="w-full sm:w-auto text-sm sm:text-base" disabled={isButtonDisabled}>
                Cancelar
              </Button>
              <Button onClick={handleSaveCommissionEdit} className="w-full sm:w-auto text-sm sm:text-base" disabled={isButtonDisabled || !commissionEditAmount || Number(commissionEditAmount) <= 0}>
                {isButtonDisabled ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={(open) => !isButtonDisabled && setDeleteDialogOpen(open)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Confirmar Eliminación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm sm:text-base">¿Está seguro de que desea eliminar este gasto?</p>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm sm:text-base"><strong>Tipo:</strong> {expenseToDelete?.type}</p>
              <p className="text-sm sm:text-base"><strong>Monto:</strong> Bs. {expenseToDelete?.amount?.toFixed(2)}</p>
              {expenseToDelete?.doctor && <p className="text-sm sm:text-base"><strong>Doctor:</strong> {expenseToDelete.doctor}</p>}
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="w-full sm:w-auto text-sm sm:text-base" disabled={isButtonDisabled}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmDelete} className="w-full sm:w-auto text-sm sm:text-base" disabled={isButtonDisabled}>
                {isButtonDisabled ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}