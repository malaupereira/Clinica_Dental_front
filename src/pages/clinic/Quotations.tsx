// src/pages/admin/Quotations.tsx
import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit2, Eye, Printer, FileText, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import QuotationsForm from './QuotationsForm';
import { generateQuotationPDF } from '@/components/QuotationPDF'; // Importar la función del PDF

export default function Quotations() {
  const { quotations, addQuotation, updateQuotation, deleteQuotation, registerQuotationPayment, doctors, refreshQuotations } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [currentPayment, setCurrentPayment] = useState({ 
    amount: 0, 
    paymentMethod: 'Efectivo' as 'QR' | 'Efectivo' | 'Mixto',
    cashAmount: 0,
    qrAmount: 0,
    doctorCommissions: {} as { [key: string]: number }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter pending quotations
  const pendingQuotations = quotations.filter((q: any) => q.status === 'pendiente');

  // Reset form
  const resetForm = () => {
    setEditingId(null);
  };

  // Handle form submit
  const handleFormSubmit = async (quotation: any) => {
    if (isSubmitting) {
      toast.error('La operación ya está siendo procesada');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateQuotation(editingId, quotation);
        toast.success('Cotización actualizada');
      } else {
        await addQuotation(quotation);
        toast.success('Cotización creada');
      }
      resetForm();
      setIsDialogOpen(false);
      await refreshQuotations(); // Refresh the list
    } catch (error) {
      console.error('Error saving quotation:', error);
      toast.error('Error al guardar la cotización');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit quotation
  const handleEdit = (quotation: any) => {
    if (isSubmitting) return;
    
    setEditingId(quotation.id);
    setIsDialogOpen(true);
  };

  // Show quotation details
  const showDetails = (quotation: any) => {
    if (isSubmitting) return;
    
    setSelectedQuotation(quotation);
    setIsDetailDialogOpen(true);
  };

  // Handle payment
  const handlePayment = (quotation: any) => {
    if (isSubmitting) return;
    
    setSelectedQuotation(quotation);
    
    // Initialize doctor commissions
    const initialCommissions: { [key: string]: number } = {};
    Object.keys(getDoctorCommissions(quotation)).forEach(doctorId => {
      initialCommissions[doctorId] = 0;
    });
    
    const pendingAmount = getPendingAmount(quotation);
    
    setCurrentPayment({ 
      amount: pendingAmount,
      paymentMethod: 'Efectivo',
      cashAmount: pendingAmount,
      qrAmount: 0,
      doctorCommissions: initialCommissions
    });
    setIsPaymentDialogOpen(true);
  };

  // Calculate doctor commissions for a quotation
  const getDoctorCommissions = (quotation: any) => {
    return quotation.services.reduce((acc: any, service: any) => {
      service.commissions.forEach((commission: any) => {
        if (!acc[commission.doctorId]) {
          acc[commission.doctorId] = 0;
        }
        acc[commission.doctorId] += Number(commission.amount) || 0;
      });
      return acc;
    }, {});
  };

  // Calculate paid commissions per doctor
  const getPaidCommissionsPerDoctor = (quotation: any) => {
    const paidCommissions: { [key: string]: number } = {};
    
    quotation.payments?.forEach((payment: any) => {
      Object.keys(payment.doctorCommissions || {}).forEach(doctorId => {
        if (!paidCommissions[doctorId]) {
          paidCommissions[doctorId] = 0;
        }
        paidCommissions[doctorId] += Number(payment.doctorCommissions[doctorId]) || 0;
      });
    });
    
    return paidCommissions;
  };

  // Calculate pending commissions per doctor
  const getPendingCommissionsPerDoctor = (quotation: any) => {
    const totalCommissions = getDoctorCommissions(quotation);
    const paidCommissions = getPaidCommissionsPerDoctor(quotation);
    const pendingCommissions: { [key: string]: number } = {};
    
    Object.keys(totalCommissions).forEach(doctorId => {
      const paid = paidCommissions[doctorId] || 0;
      const total = totalCommissions[doctorId] || 0;
      pendingCommissions[doctorId] = Math.max(0, total - paid);
    });
    
    return pendingCommissions;
  };

  // Calculate commission percentage for a doctor
  const getDoctorCommissionPercentage = (quotation: any, doctorId: string) => {
    const totalCommissions = getDoctorCommissions(quotation);
    const doctorTotal = Number(totalCommissions[doctorId]) || 0;
    if (doctorTotal === 0) return 0;
    
    return (doctorTotal / Number(quotation.total)) * 100;
  };

  // Handle payment method change
  const handlePaymentMethodChange = (method: 'QR' | 'Efectivo' | 'Mixto') => {
    if (isSubmitting) return;
    
    setCurrentPayment(prev => {
      const newPayment = { ...prev, paymentMethod: method };
      
      if (method === 'Efectivo') {
        newPayment.cashAmount = prev.amount;
        newPayment.qrAmount = 0;
      } else if (method === 'QR') {
        newPayment.cashAmount = 0;
        newPayment.qrAmount = prev.amount;
      } else {
        // Mixto - dividir automáticamente
        newPayment.cashAmount = Math.floor(prev.amount / 2);
        newPayment.qrAmount = Math.ceil(prev.amount / 2);
      }
      
      return newPayment;
    });
  };

  // Handle cash amount change for mixed payment
  const handleCashAmountChange = (value: number) => {
    if (isSubmitting) return;
    
    setCurrentPayment(prev => ({
      ...prev,
      cashAmount: value,
      qrAmount: prev.amount - value,
      amount: prev.amount // Mantener el amount total
    }));
  };

  // Handle QR amount change for mixed payment
  const handleQrAmountChange = (value: number) => {
    if (isSubmitting) return;
    
    setCurrentPayment(prev => ({
      ...prev,
      qrAmount: value,
      cashAmount: prev.amount - value,
      amount: prev.amount // Mantener el amount total
    }));
  };

  // Auto-calculate doctor commissions when payment amount changes
  useEffect(() => {
    if (selectedQuotation && currentPayment.amount > 0 && !isSubmitting) {
      const newDoctorCommissions: { [key: string]: number } = {};
      const pendingCommissions = getPendingCommissionsPerDoctor(selectedQuotation);
      
      Object.keys(pendingCommissions).forEach(doctorId => {
        const percentage = getDoctorCommissionPercentage(selectedQuotation, doctorId);
        const suggestedAmount = Math.round((Number(currentPayment.amount) * percentage) / 100);
        const maxAmount = Number(pendingCommissions[doctorId]) || 0;
        
        // Use suggested amount but don't exceed pending amount
        newDoctorCommissions[doctorId] = Math.min(suggestedAmount, maxAmount);
      });
      
      setCurrentPayment(prev => ({
        ...prev,
        doctorCommissions: newDoctorCommissions
      }));
    }
  }, [currentPayment.amount, selectedQuotation, isSubmitting]);

  // Process payment
  const processPayment = async () => {
    if (isSubmitting) {
      toast.error('El pago ya está siendo procesado');
      return;
    }

    if (!selectedQuotation) return;

    const paymentAmount = Number(currentPayment.amount) || 0;
    if (paymentAmount <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    const pendingAmount = getPendingAmount(selectedQuotation);
    if (paymentAmount > pendingAmount) {
      toast.error('El monto no puede ser mayor al total pendiente');
      return;
    }

    // Validate mixed payment
    if (currentPayment.paymentMethod === 'Mixto') {
      const totalMixed = currentPayment.cashAmount + currentPayment.qrAmount;
      if (Math.abs(totalMixed - paymentAmount) >= 0.01) {
        toast.error('La suma de efectivo y QR debe ser igual al monto total');
        return;
      }
    }

    // Validate doctor commissions
    const totalDoctorCommissions = Object.values(currentPayment.doctorCommissions).reduce((sum: number, amount: any) => sum + (Number(amount) || 0), 0);
    if (totalDoctorCommissions > paymentAmount) {
      toast.error('Las comisiones no pueden ser mayores al monto del pago');
      return;
    }

    const pendingCommissions = getPendingCommissionsPerDoctor(selectedQuotation);
    let commissionError = false;
    
    Object.entries(currentPayment.doctorCommissions).forEach(([doctorId, amount]) => {
      const numAmount = Number(amount) || 0;
      const maxAmount = Number(pendingCommissions[doctorId]) || 0;
      
      if (numAmount > maxAmount) {
        const doctor = doctors.find(d => d.id === doctorId);
        toast.error(`La comisión para ${doctor?.name} no puede ser mayor a Bs. ${maxAmount.toFixed(2)}`);
        commissionError = true;
      }
    });

    if (commissionError) return;

    setIsSubmitting(true);
    try {
      const paymentData = {
        quotationId: selectedQuotation.id,
        amount: paymentAmount,
        paymentMethod: currentPayment.paymentMethod,
        cashAmount: currentPayment.paymentMethod === 'Mixto' ? currentPayment.cashAmount : 
                   currentPayment.paymentMethod === 'Efectivo' ? paymentAmount : 0,
        qrAmount: currentPayment.paymentMethod === 'Mixto' ? currentPayment.qrAmount : 
                  currentPayment.paymentMethod === 'QR' ? paymentAmount : 0,
        doctorCommissions: currentPayment.doctorCommissions
      };
      
      const updatedQuotation = await registerQuotationPayment(paymentData);
      
      // Verificar si la cotización se completó
      if (updatedQuotation.status === 'completado') {
        toast.success('Pago registrado exitosamente - ¡Cotización completada!');
      } else {
        toast.success('Pago registrado exitosamente');
      }
      
      setIsPaymentDialogOpen(false);
      setSelectedQuotation(null);
      await refreshQuotations(); // Refresh the list
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Error al registrar el pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete quotation
  const handleDeleteQuotation = async () => {
    if (isSubmitting) {
      toast.error('La operación ya está siendo procesada');
      return;
    }

    if (!selectedQuotation) return;
    
    setIsSubmitting(true);
    try {
      await deleteQuotation(selectedQuotation.id);
      toast.success('Cotización eliminada');
      setIsDeleteDialogOpen(false);
      setSelectedQuotation(null);
      await refreshQuotations(); // Refresh the list
    } catch (error) {
      console.error('Error deleting quotation:', error);
      toast.error('Error al eliminar la cotización');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate pending amount
  const getPendingAmount = (quotation: any) => {
    const totalPaid = quotation.payments?.reduce((sum: number, payment: any) => sum + (Number(payment.amount) || 0), 0) || 0;
    return Math.max(0, Number(quotation.total) - totalPaid);
  };

  // Calculate total commissions
  const getTotalCommissions = (quotation: any) => {
    return quotation.services.reduce((total: number, service: any) => {
      const serviceCommissions = service.commissions.reduce((sum: number, comm: any) => sum + (Number(comm.amount) || 0), 0);
      return total + serviceCommissions;
    }, 0);
  };

  // Calculate total net
  const getTotalNet = (quotation: any) => {
    return Number(quotation.total) - getTotalCommissions(quotation);
  };

  // Calculate subtotal for a service (price * quantity)
  const calculateServiceSubtotal = (service: any) => {
    return Math.round(Number(service.price) * Number(service.quantity || 1));
  };

  // Update doctor commission in payment
  const updateDoctorCommission = (doctorId: string, amount: number) => {
    if (isSubmitting) return;
    
    setCurrentPayment(prev => ({
      ...prev,
      doctorCommissions: {
        ...prev.doctorCommissions,
        [doctorId]: Math.max(0, amount)
      }
    }));
  };

  // Print quotation - AHORA USA EL PDF
  const printQuotation = async (quotation: any) => {
    if (isSubmitting) {
      toast.error('La operación ya está siendo procesada');
      return;
    }

    try {
      toast.info('Generando PDF...');
      await generateQuotationPDF(quotation, doctors);
      toast.success('PDF descargado exitosamente');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el PDF');
    }
  };

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Close all dialogs when back button is pressed
      if (isDialogOpen || isDetailDialogOpen || isPaymentDialogOpen || isDeleteDialogOpen) {
        event.preventDefault();
        setIsDialogOpen(false);
        setIsDetailDialogOpen(false);
        setIsPaymentDialogOpen(false);
        setIsDeleteDialogOpen(false);
        resetForm();
        setSelectedQuotation(null);
        
        // Push state again to keep user on current page
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    // Push initial state
    window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isDialogOpen, isDetailDialogOpen, isPaymentDialogOpen, isDeleteDialogOpen]);

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-primary">Cotizaciones Pendientes</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (isSubmitting) return;
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto" disabled={isSubmitting}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Cotización
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Cotización' : 'Nueva Cotización'}
              </DialogTitle>
            </DialogHeader>
            <QuotationsForm
              editingId={editingId}
              quotationData={editingId ? quotations.find((q: any) => q.id === editingId) : undefined}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                resetForm();
                setIsDialogOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Cotizaciones Pendientes */}
      <div className="grid gap-4">
        {pendingQuotations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No hay cotizaciones pendientes
              </p>
            </CardContent>
          </Card>
        ) : (
          pendingQuotations.map((quotation: any) => (
            <Card key={quotation.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{quotation.clientName}</h3>
                      <Badge variant={getPendingAmount(quotation) > 0 ? "secondary" : "default"}>
                        {getPendingAmount(quotation) > 0 ? 'Pendiente' : 'Completado'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Teléfono: {quotation.phone}</p>
                      <p>Fecha: {new Date(quotation.date).toLocaleDateString()}</p>
                      {quotation.userName && (
                        <p>Creado por: {quotation.userName}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Total: </span>
                        <span>Bs. {Number(quotation.total).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Comisiones: </span>
                        <span className="text-red-600">Bs. {getTotalCommissions(quotation).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Neto: </span>
                        <span className="text-green-600">Bs. {getTotalNet(quotation).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-primary">
                      Total Pendiente: Bs. {getPendingAmount(quotation).toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => showDetails(quotation)}
                      disabled={isSubmitting}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => printQuotation(quotation)}
                      disabled={isSubmitting}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(quotation)}
                      disabled={isSubmitting}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePayment(quotation)}
                      disabled={getPendingAmount(quotation) <= 0 || isSubmitting}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedQuotation(quotation);
                        setIsDeleteDialogOpen(true);
                      }}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Diálogo de Detalles - MEJORADO PARA PANTALLAS PEQUEÑAS */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4 border-b">
            <DialogTitle>Detalles de Cotización</DialogTitle>
          </DialogHeader>
          {selectedQuotation && (
            <div className="space-y-6 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Cliente:</Label>
                  <p>{selectedQuotation.clientName}</p>
                </div>
                <div>
                  <Label className="font-semibold">Teléfono:</Label>
                  <p>{selectedQuotation.phone}</p>
                </div>
                <div>
                  <Label className="font-semibold">Fecha:</Label>
                  <p>{new Date(selectedQuotation.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="font-semibold">Total:</Label>
                  <p className="font-bold">Bs. {Number(selectedQuotation.total).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="font-semibold">Estado:</Label>
                  <Badge variant={selectedQuotation.status === 'pendiente' ? "secondary" : "default"}>
                    {selectedQuotation.status === 'pendiente' ? 'Pendiente' : 'Completado'}
                  </Badge>
                </div>
                {selectedQuotation.userName && (
                  <div className="md:col-span-2">
                    <Label className="font-semibold">Creado por:</Label>
                    <p>{selectedQuotation.userName}</p>
                  </div>
                )}
              </div>

              <div>
                <Label className="font-semibold">Servicios:</Label>
                <div className="border rounded-md p-3 mt-2 max-h-60 overflow-y-auto">
                  {selectedQuotation.services.map((service: any, idx: number) => {
                    const serviceSubtotal = calculateServiceSubtotal(service);
                    const serviceCommissions = service.commissions.reduce((sum: number, comm: any) => sum + (Number(comm.amount) || 0), 0);
                    const serviceNet = serviceSubtotal - serviceCommissions;
                    const quantity = Number(service.quantity) || 1;
                    
                    return (
                      <div key={idx} className="py-2 border-b last:border-b-0">
                        <div className="flex justify-between">
                          <div>
                            <span className="font-medium">
                              {service.serviceName}
                              {quantity > 1 && (
                                <span className="text-sm text-muted-foreground ml-1">x{quantity}</span>
                              )}
                            </span>
                            <div className="text-sm text-muted-foreground">
                              {service.specialtyName}
                            </div>
                          </div>
                          <div className="text-right">
                            <div>Bs. {serviceSubtotal.toFixed(2)}</div>
                            {quantity > 1 && (
                              <div className="text-xs text-muted-foreground">
                                (Bs. {Number(service.price).toFixed(2)} x {quantity})
                              </div>
                            )}
                          </div>
                        </div>
                        {service.commissions.length > 0 && (
                          <div className="text-xs text-blue-600 mt-1">
                            Comisiones: {service.commissions.map((comm: any) => {
                              const doctor = doctors.find(d => d.id === comm.doctorId);
                              return `${doctor?.name} (${comm.percentage}%)`;
                            }).join(', ')}
                          </div>
                        )}
                        <div className="text-xs grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 mt-1">
                          <span className="text-red-600">- Comisiones: Bs. {serviceCommissions.toFixed(2)}</span>
                          <span className="text-green-600">Neto: Bs. {serviceNet.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Comisiones por Doctor */}
              {Object.keys(getDoctorCommissions(selectedQuotation)).length > 0 && (
                <div>
                  <Label className="font-semibold">Comisiones por Doctor:</Label>
                  <div className="border rounded-md p-3 mt-2 space-y-2 max-h-60 overflow-y-auto">
                    {Object.entries(getDoctorCommissions(selectedQuotation)).map(([doctorId, totalAmount]) => {
                      const doctor = doctors.find(d => d.id === doctorId);
                      const paidAmount = getPaidCommissionsPerDoctor(selectedQuotation)[doctorId] || 0;
                      const pendingAmount = getPendingCommissionsPerDoctor(selectedQuotation)[doctorId] || 0;
                      const total = Number(totalAmount) || 0;
                      const percentage = total > 0 ? ((total / Number(selectedQuotation.total)) * 100).toFixed(1) : '0.0';
                      
                      return (
                        <div key={doctorId} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 border rounded gap-2">
                          <div className="flex-1">
                            <span className="font-medium">Dr. {doctor?.name}</span>
                            <div className="text-sm text-muted-foreground">
                              {percentage}% del total
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm space-y-1">
                              <div className="text-green-600">Pagado: Bs. {Number(paidAmount).toFixed(2)}</div>
                              <div className="text-orange-600">Pendiente: Bs. {Number(pendingAmount).toFixed(2)}</div>
                            </div>
                            <div className="font-medium">Total: Bs. {total.toFixed(2)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Registro de Pagos */}
              {selectedQuotation.payments && selectedQuotation.payments.length > 0 && (
                <div>
                  <Label className="font-semibold">Registro de Pagos:</Label>
                  <div className="border rounded-md p-3 mt-2 space-y-3 max-h-60 overflow-y-auto">
                    {selectedQuotation.payments.map((payment: any) => (
                      <div key={payment.id} className="border-b last:border-b-0 pb-3 last:pb-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                          <div className="flex-1">
                            <div className="font-medium">
                              {new Date(payment.date).toLocaleDateString()} - {payment.paymentMethod}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Monto: <span className="font-bold text-green-600">Bs. {Number(payment.amount).toFixed(2)}</span>
                              {payment.paymentMethod === 'Mixto' && payment.cashAmount && payment.qrAmount && (
                                <span className="ml-2">
                                  (Efectivo: Bs. {Number(payment.cashAmount).toFixed(2)}, QR: Bs. {Number(payment.qrAmount).toFixed(2)})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Detalles de servicios en el pago */}
                        {payment.serviceDetails && payment.serviceDetails.length > 0 && (
                          <div className="mt-3 text-sm">
                            <div className="text-muted-foreground text-xs mb-1">Servicios incluidos:</div>
                            <div className="space-y-1 pl-2 border-l-2 border-gray-200">
                              {payment.serviceDetails.map((detail: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-xs">
                                  <span>
                                    {detail.serviceName}
                                    {detail.quantity > 1 && (
                                      <span className="text-muted-foreground ml-1">x{detail.quantity}</span>
                                    )}
                                  </span>
                                  <span>Bs. {Number(detail.subtotal).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Comisiones por doctor en este pago */}
                        {payment.doctorCommissions && Object.keys(payment.doctorCommissions).length > 0 && (
                          <div className="mt-2 text-sm">
                            <div className="text-muted-foreground text-xs mb-1">Comisiones en este pago:</div>
                            <div className="space-y-1">
                              {Object.entries(payment.doctorCommissions).map(([doctorId, amount]) => {
                                const doctor = doctors.find(d => d.id === doctorId);
                                const numAmount = Number(amount) || 0;
                                if (numAmount === 0) return null;
                                return (
                                  <div key={doctorId} className="flex justify-between text-xs">
                                    <span>{doctor?.name}:</span>
                                    <span className="text-red-600">Bs. {numAmount.toFixed(2)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resumen Final */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 border rounded-lg bg-muted/30">
                <div className="text-center">
                  <Label className="text-sm font-medium">Total Pagado</Label>
                  <div className="text-lg font-bold text-blue-600">
                    Bs. {(Number(selectedQuotation.total) - getPendingAmount(selectedQuotation)).toFixed(2)}
                  </div>
                </div>
                <div className="text-center">
                  <Label className="text-sm font-medium">Total Pendiente</Label>
                  <div className="text-lg font-bold text-orange-600">
                    Bs. {getPendingAmount(selectedQuotation).toFixed(2)}
                  </div>
                </div>
                <div className="text-center">
                  <Label className="text-sm font-medium">Total General</Label>
                  <div className="text-xl font-bold">Bs. {Number(selectedQuotation.total).toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de Pago - MEJORADO PARA PANTALLAS PEQUEÑAS */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4 border-b">
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>
          {selectedQuotation && (
            <div className="space-y-4 py-2">
              <div>
                <Label className="font-semibold">Cliente:</Label>
                <p>{selectedQuotation.clientName}</p>
              </div>
              
              <div>
                <Label className="font-semibold">Total Pendiente:</Label>
                <p className="font-bold text-lg">Bs. {getPendingAmount(selectedQuotation).toFixed(2)}</p>
              </div>

              {/* Comisiones pendientes por doctor */}
              {Object.keys(getPendingCommissionsPerDoctor(selectedQuotation)).length > 0 && (
                <div className="space-y-2 p-3 border rounded-lg bg-blue-50 max-h-40 overflow-y-auto">
                  <Label className="font-semibold text-sm">Comisiones Pendientes por Doctor:</Label>
                  {Object.entries(getPendingCommissionsPerDoctor(selectedQuotation)).map(([doctorId, pendingAmount]) => {
                    const doctor = doctors.find(d => d.id === doctorId);
                    const paidAmount = getPaidCommissionsPerDoctor(selectedQuotation)[doctorId] || 0;
                    const totalAmount = getDoctorCommissions(selectedQuotation)[doctorId] || 0;
                    const percentage = getDoctorCommissionPercentage(selectedQuotation, doctorId).toFixed(1);
                    const numPendingAmount = Number(pendingAmount) || 0;
                    
                    if (numPendingAmount <= 0) return null;
                    
                    return (
                      <div key={doctorId} className="text-sm p-2 bg-white rounded border">
                        <div className="flex justify-between">
                          <span className="font-medium">Dr. {doctor?.name}</span>
                          <span className="text-muted-foreground">{percentage}%</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Pagado: Bs. {Number(paidAmount).toFixed(2)} | Pendiente: Bs. {numPendingAmount.toFixed(2)} | Total: Bs. {Number(totalAmount).toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Monto a Pagar (Bs.) *</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  value={currentPayment.amount || ''}
                  onChange={(e) => {
                    if (isSubmitting) return;
                    const newAmount = parseFloat(e.target.value) || 0;
                    setCurrentPayment(prev => ({
                      ...prev,
                      amount: newAmount,
                      cashAmount: prev.paymentMethod === 'Efectivo' ? newAmount : 
                                 prev.paymentMethod === 'QR' ? 0 : Math.floor(newAmount / 2),
                      qrAmount: prev.paymentMethod === 'QR' ? newAmount : 
                                prev.paymentMethod === 'Efectivo' ? 0 : Math.ceil(newAmount / 2)
                    }));
                  }}
                  placeholder="0.00"
                  max={getPendingAmount(selectedQuotation)}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  El sistema calculará automáticamente las comisiones sugeridas
                </p>
              </div>

              <div className="space-y-2">
                <Label>Método de Pago *</Label>
                <Select
                  value={currentPayment.paymentMethod}
                  onValueChange={handlePaymentMethodChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                    <SelectItem value="QR">QR</SelectItem>
                    <SelectItem value="Mixto">Mixto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Campos para pago mixto */}
              {currentPayment.paymentMethod === 'Mixto' && (
                <div className="grid grid-cols-2 gap-4 p-3 border rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label className="text-sm">Efectivo (Bs.)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentPayment.cashAmount || ''}
                      onChange={(e) => handleCashAmountChange(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      onWheel={(e) => e.currentTarget.blur()}
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">QR (Bs.)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentPayment.qrAmount || ''}
                      onChange={(e) => handleQrAmountChange(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      onWheel={(e) => e.currentTarget.blur()}
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="col-span-2 text-center text-sm font-medium">
                    Total: Bs. {(currentPayment.cashAmount + currentPayment.qrAmount).toFixed(2)}
                    {Math.abs((currentPayment.cashAmount + currentPayment.qrAmount) - currentPayment.amount) >= 0.01 && (
                      <p className="text-xs text-red-600 mt-1">
                        ⚠️ Los montos no coinciden con el total
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Comisiones por doctor en este pago */}
              {Object.keys(getPendingCommissionsPerDoctor(selectedQuotation)).length > 0 && (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  <Label className="font-semibold">Comisiones en este pago:</Label>
                  {Object.entries(getPendingCommissionsPerDoctor(selectedQuotation)).map(([doctorId, pendingAmount]) => {
                    const doctor = doctors.find(d => d.id === doctorId);
                    const percentage = getDoctorCommissionPercentage(selectedQuotation, doctorId).toFixed(1);
                    const numPendingAmount = Number(pendingAmount) || 0;
                    if (numPendingAmount <= 0) return null;
                    
                    return (
                      <div key={doctorId} className="space-y-1 p-2 border rounded">
                        <Label htmlFor={`commission-${doctorId}`} className="text-sm">
                          Monto Comisión Dr. {doctor?.name} ({percentage}%)
                        </Label>
                        <Input
                          id={`commission-${doctorId}`}
                          type="number"
                          step="0.01"
                          value={currentPayment.doctorCommissions[doctorId] || ''}
                          onChange={(e) => updateDoctorCommission(doctorId, parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          max={numPendingAmount}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          disabled={isSubmitting}
                        />
                        <div className="text-xs text-muted-foreground flex flex-col sm:flex-row sm:justify-between gap-1">
                          <span>Máximo: Bs. {numPendingAmount.toFixed(2)}</span>
                          <span>Pendiente después: Bs. {(numPendingAmount - (Number(currentPayment.doctorCommissions[doctorId]) || 0)).toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-4 sticky bottom-0 bg-background pb-2">
                <Button onClick={processPayment} className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? 'Procesando...' : 'Registrar Pago'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsPaymentDialogOpen(false)}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la cotización de {selectedQuotation?.clientName}. 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuotation} disabled={isSubmitting}>
              {isSubmitting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}