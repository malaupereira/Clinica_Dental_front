// src/pages/admin/RegisterClinic.tsx
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { createConsultation, ConsultationRequest } from '@/api/ClinicApi';

interface ServiceCommission {
  doctorId: string;
  percentage: number;
  amount: number;
  commissionType: 'percentage' | 'amount';
}

interface ServiceWithCommissions {
  serviceId: string;
  specialtyId: string;
  specialtyName?: string;
  serviceName?: string;
  price: number;
  quantity: number;
  commissions: ServiceCommission[];
}

export default function RegisterConsultation() {
  const { specialties, doctors, refreshTransactions, refreshExpenses, refreshClinicRecords } = useApp();
  const { user } = useAuth();
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [patientName, setPatientName] = useState('');
  const [services, setServices] = useState<ServiceWithCommissions[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'QR' | 'Efectivo' | 'Mixto'>('Efectivo');
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [qrAmount, setQrAmount] = useState<number>(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredDoctors = doctors.filter(d => 
    (d.specialtyIds || []).some(id => selectedSpecialties.includes(id))
  );

  const availableServices = specialties
    .filter(s => selectedSpecialties.includes(s.id))
    .flatMap(s => s.services.map(service => ({ ...service, specialtyId: s.id, specialtyName: s.name })));

  const toggleSpecialty = (specialtyId: string) => {
    if (isSubmitting) return;
    
    if (selectedSpecialties.includes(specialtyId)) {
      setSelectedSpecialties(selectedSpecialties.filter(id => id !== specialtyId));
      setServices(services.filter(s => s.specialtyId !== specialtyId));
      setSelectedDoctors([]);
    } else {
      setSelectedSpecialties([...selectedSpecialties, specialtyId]);
    }
  };

  const toggleDoctor = (doctorId: string) => {
    if (isSubmitting) return;
    
    if (selectedDoctors.includes(doctorId)) {
      setSelectedDoctors(selectedDoctors.filter(id => id !== doctorId));
      setServices(services.map(service => ({
        ...service,
        commissions: service.commissions.filter(comm => comm.doctorId !== doctorId)
      })));
    } else {
      setSelectedDoctors([...selectedDoctors, doctorId]);
      const doctor = doctors.find(d => d.id === doctorId);
      if (doctor?.paymentType === 'comision') {
        setServices(services.map(service => {
          const hasSpecialty = (doctor.specialtyIds || []).includes(service.specialtyId);
          if (hasSpecialty && service.specialtyId) {
            const existingCommission = service.commissions.find(comm => comm.doctorId === doctorId);
            if (!existingCommission) {
              return {
                ...service,
                commissions: [
                  ...service.commissions,
                  { doctorId, percentage: 0, amount: 0, commissionType: 'percentage' }
                ]
              };
            }
          }
          return service;
        }));
      }
    }
  };

  const addService = () => {
    if (isSubmitting) return;
    
    const newService: ServiceWithCommissions = {
      serviceId: '',
      specialtyId: '',
      price: 0,
      quantity: 1,
      commissions: selectedDoctors
        .filter(doctorId => {
          const doctor = doctors.find(d => d.id === doctorId);
          return doctor?.paymentType === 'comision';
        })
        .map(doctorId => ({ doctorId, percentage: 0, amount: 0, commissionType: 'percentage' }))
    };
    setServices([...services, newService]);
  };

  const removeService = (index: number) => {
    if (isSubmitting) return;
    
    setServices(services.filter((_, i) => i !== index));
  };

  const updateService = (index: number, field: 'serviceId' | 'price' | 'quantity', value: string | number) => {
    if (isSubmitting) return;
    
    const newServices = [...services];
    if (field === 'serviceId') {
      const service = availableServices.find(s => s.id === value);
      if (service) {
        newServices[index] = {
          serviceId: value as string,
          serviceName: service.name,
          specialtyId: service.specialtyId,
          specialtyName: service.specialtyName,
          price: service.price || 0,
          quantity: newServices[index].quantity || 1,
          commissions: selectedDoctors
            .filter(doctorId => {
              const doctor = doctors.find(d => d.id === doctorId);
              return doctor?.paymentType === 'comision' && 
                     (doctor.specialtyIds || []).includes(service.specialtyId);
            })
            .map(doctorId => ({ doctorId, percentage: 0, amount: 0, commissionType: 'percentage' }))
        };
      }
    } else if (field === 'price') {
      const numValue = Number(value) || 0;
      newServices[index].price = numValue;
      newServices[index].commissions = newServices[index].commissions.map(comm => {
        const serviceSubtotal = calculateServiceSubtotal(newServices[index]);
        if (comm.commissionType === 'percentage') {
          const amount = (serviceSubtotal * comm.percentage) / 100;
          return { ...comm, amount };
        } else {
          return { ...comm, amount: comm.amount };
        }
      });
    } else if (field === 'quantity') {
      if (value === '') {
        newServices[index].quantity = '' as any;
      } else {
        const intValue = Math.round(Number(value) || 1);
        if (intValue < 1) {
          toast.error('La cantidad no puede ser menor a 1');
          return;
        }
        newServices[index].quantity = intValue;
        newServices[index].commissions = newServices[index].commissions.map(comm => {
          const serviceSubtotal = calculateServiceSubtotal(newServices[index]);
          if (comm.commissionType === 'percentage') {
            const amount = (serviceSubtotal * comm.percentage) / 100;
            return { ...comm, amount };
          } else {
            const amountPerUnit = comm.amount / (newServices[index].quantity || 1);
            const newTotalAmount = amountPerUnit * intValue;
            return { ...comm, amount: newTotalAmount };
          }
        });
      }
    }
    setServices(newServices);
  };

  const calculateServiceSubtotal = (service: ServiceWithCommissions) => {
    return Math.round(Number(service.price) * Number(service.quantity || 1));
  };

  const updateCommission = (serviceIndex: number, doctorId: string, value: number, type: 'percentage' | 'amount') => {
    if (isSubmitting) return;
    
    const newServices = [...services];
    const service = newServices[serviceIndex];
    const commissionIndex = service.commissions.findIndex(comm => comm.doctorId === doctorId);
    
    if (commissionIndex !== -1) {
      const serviceSubtotal = calculateServiceSubtotal(service);
      
      if (type === 'percentage') {
        if (value > 100) {
          toast.error('El porcentaje no puede ser mayor a 100%');
          return;
        }
        const amount = (serviceSubtotal * value) / 100;
        newServices[serviceIndex].commissions[commissionIndex] = {
          doctorId,
          percentage: value,
          amount,
          commissionType: 'percentage'
        };
      } else {
        const maxAmount = serviceSubtotal;
        if (value > maxAmount) {
          toast.error(`El monto no puede exceder Bs. ${maxAmount}`);
          return;
        }
        const percentage = serviceSubtotal > 0 ? (value / serviceSubtotal) * 100 : 0;
        newServices[serviceIndex].commissions[commissionIndex] = {
          doctorId,
          percentage,
          amount: value,
          commissionType: 'amount'
        };
      }
      
      setServices(newServices);
    }
  };

  const toggleCommissionType = (serviceIndex: number, doctorId: string) => {
    if (isSubmitting) return;
    
    const newServices = [...services];
    const service = newServices[serviceIndex];
    const commissionIndex = service.commissions.findIndex(comm => comm.doctorId === doctorId);
    
    if (commissionIndex !== -1) {
      const commission = service.commissions[commissionIndex];
      const newType = commission.commissionType === 'percentage' ? 'amount' : 'percentage';
      const serviceSubtotal = calculateServiceSubtotal(service);
      
      if (newType === 'amount') {
        const percentage = serviceSubtotal > 0 ? (commission.amount / serviceSubtotal) * 100 : 0;
        newServices[serviceIndex].commissions[commissionIndex] = {
          ...commission,
          commissionType: newType,
          percentage
        };
      } else {
        const amount = (serviceSubtotal * commission.percentage) / 100;
        newServices[serviceIndex].commissions[commissionIndex] = {
          ...commission,
          commissionType: newType,
          amount
        };
      }
      
      setServices(newServices);
    }
  };

  const getTotalCommissionPercentage = (service: ServiceWithCommissions) => {
    const serviceSubtotal = calculateServiceSubtotal(service);
    if (serviceSubtotal === 0) return 0;
    const totalCommissionAmount = service.commissions.reduce((sum, comm) => sum + comm.amount, 0);
    return (totalCommissionAmount / serviceSubtotal) * 100;
  };

  const getServiceCommissionsTotal = (service: ServiceWithCommissions) => {
    return service.commissions.reduce((sum, comm) => sum + comm.amount, 0);
  };

  const getServiceNetTotal = (service: ServiceWithCommissions) => {
    const serviceSubtotal = calculateServiceSubtotal(service);
    return serviceSubtotal - getServiceCommissionsTotal(service);
  };

  const total = services.reduce((sum, service) => sum + calculateServiceSubtotal(service), 0);

  const handleCashAmountChange = (value: number) => {
    if (isSubmitting) return;
    
    setCashAmount(value);
    setQrAmount(Math.max(0, total - value));
  };

  const handleQrAmountChange = (value: number) => {
    if (isSubmitting) return;
    
    setQrAmount(value);
    setCashAmount(Math.max(0, total - value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) {
      toast.error('La consulta ya está siendo procesada');
      return;
    }
    
    if (selectedSpecialties.length === 0 || selectedDoctors.length === 0 || !patientName.trim() || services.length === 0) {
      toast.error('Complete todos los campos requeridos');
      return;
    }

    const hasInvalidQuantity = services.some(service => 
      service.quantity < 1 || !Number.isInteger(service.quantity)
    );

    if (hasInvalidQuantity) {
      toast.error('Por favor ingrese una cantidad válida para todos los servicios (mínimo 1)');
      return;
    }

    if (paymentMethod === 'Mixto' && (cashAmount + qrAmount !== total)) {
      toast.error('La suma de efectivo y QR debe ser igual al total');
      return;
    }

    const hasInvalidCommissions = services.some(service => {
      const serviceSubtotal = calculateServiceSubtotal(service);
      const totalCommissionAmount = getServiceCommissionsTotal(service);
      return totalCommissionAmount > serviceSubtotal;
    });

    if (hasInvalidCommissions) {
      toast.error('Las comisiones no pueden superar el total del servicio');
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmSubmit = async () => {
    if (isSubmitting) {
      toast.error('La consulta ya está siendo procesada');
      return;
    }
    
    setIsSubmitting(true);
    setLoading(true);
    
    try {
      const doctorNames = selectedDoctors.map(doctorId => 
        doctors.find(d => d.id === doctorId)?.name
      ).join(', ');

      let detalles = `Consulta - Drs. ${doctorNames}`;
      
      if (paymentMethod === 'Mixto') {
        detalles += ` - Mixto (Efectivo: Bs. ${cashAmount.toFixed(2)}, QR: Bs. ${qrAmount.toFixed(2)})`;
      }

      const serviciosData = services.map(service => {
        const serviceSubtotal = calculateServiceSubtotal(service);
        const doctoresComisiones = service.commissions
          .filter(comm => comm.amount > 0)
          .map(comm => ({
            iddoctor: parseInt(comm.doctorId),
            porcentaje: comm.percentage,
            monto_comision: comm.amount
          }));

        return {
          idservicio: parseInt(service.serviceId),
          cantidad: service.quantity || 1,
          precio_unitario: service.price,
          subtotal: serviceSubtotal,
          doctores_comisiones: doctoresComisiones.length > 0 ? doctoresComisiones : undefined
        };
      });

      const consultationData: ConsultationRequest = {
        idusuario: user?.idUsuario || 0,
        paciente: patientName,
        detalles: detalles,
        metodo_pago: paymentMethod,
        monto_total: total,
        monto_efectivo: paymentMethod === 'QR' ? 0 : (paymentMethod === 'Mixto' ? cashAmount : total),
        monto_qr: paymentMethod === 'Efectivo' ? 0 : (paymentMethod === 'Mixto' ? qrAmount : total),
        servicios: serviciosData
      };

      const result = await createConsultation(consultationData);

      if (result.success) {
        toast.success('Consulta registrada exitosamente');
        
        await Promise.all([
          refreshTransactions(),
          refreshExpenses(),
          refreshClinicRecords()
        ]);

        setSelectedSpecialties([]);
        setSelectedDoctors([]);
        setPatientName('');
        setServices([]);
        setPaymentMethod('Efectivo');
        setCashAmount(0);
        setQrAmount(0);
        setShowConfirmDialog(false);
      } else {
        toast.error('Error al registrar la consulta');
      }
    } catch (error: any) {
      console.error('Error al registrar consulta:', error);
      toast.error(error.message || 'Error al registrar la consulta');
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const renderCommissionDetails = () => {
    const commissionGroups: { [key: string]: { doctorName: string; percentage: number; amount: number; serviceName: string }[] } = {};

    services.forEach(service => {
      const serviceName = service.serviceName || 'Servicio';
      service.commissions.forEach(comm => {
        const doctor = doctors.find(d => d.id === comm.doctorId);
        if (doctor && comm.amount > 0) {
          if (!commissionGroups[doctor.name]) {
            commissionGroups[doctor.name] = [];
          }
          commissionGroups[doctor.name].push({
            doctorName: doctor.name,
            percentage: comm.percentage,
            amount: comm.amount,
            serviceName
          });
        }
      });
    });

    return Object.entries(commissionGroups).map(([doctorName, commissions]) => (
      <div key={doctorName} className="mt-2">
        <div className="font-medium text-sm">{doctorName}:</div>
        <div className="ml-4 space-y-1">
          {commissions.map((comm, index) => (
            <div key={index} className="text-xs text-muted-foreground">
              {comm.serviceName}: {comm.percentage.toFixed(1)}% = Bs. {comm.amount.toFixed(2)}
            </div>
          ))}
          <div className="text-xs font-semibold">
            Total: Bs. {commissions.reduce((sum, comm) => sum + comm.amount, 0).toFixed(2)}
          </div>
        </div>
      </div>
    ));
  };

  const hasCommissions = services.some(s => s.commissions.some(comm => comm.amount > 0));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Registrar Consulta - Dental Studio</h1>
        <p className="text-muted-foreground">Registre una nueva consulta médica</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de la Consulta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Nombre del Paciente</Label>
              <Input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Ingrese el nombre del paciente"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label>Especialidades</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/30">
                {specialties.map(specialty => (
                  <div key={specialty.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={specialty.id}
                      checked={selectedSpecialties.includes(specialty.id)}
                      onCheckedChange={() => toggleSpecialty(specialty.id)}
                      disabled={isSubmitting}
                    />
                    <Label htmlFor={specialty.id} className="cursor-pointer">
                      {specialty.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Doctores</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/30">
                {filteredDoctors.map(doctor => (
                  <div key={doctor.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={doctor.id}
                      checked={selectedDoctors.includes(doctor.id)}
                      onCheckedChange={() => toggleDoctor(doctor.id)}
                      disabled={selectedSpecialties.length === 0 || isSubmitting}
                    />
                    <Label htmlFor={doctor.id} className="cursor-pointer">
                      {doctor.name} 
                      <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                        doctor.paymentType === 'comision' 
                          ? 'bg-orange-100 text-orange-800 border border-orange-200' 
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {doctor.paymentType === 'comision' ? 'Comisión' : 'Sueldo'}
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Servicios Realizados</Label>
                <Button 
                  type="button" 
                  onClick={addService} 
                  size="sm" 
                  disabled={selectedSpecialties.length === 0 || isSubmitting}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Servicio
                </Button>
              </div>

              {services.map((service, serviceIndex) => {
                const selectedService = availableServices.find(s => s.id === service.serviceId);
                const serviceSubtotal = calculateServiceSubtotal(service);
                const serviceCommissionsTotal = getServiceCommissionsTotal(service);
                const serviceNetTotal = getServiceNetTotal(service);
                const totalServiceCommissionPercentage = getTotalCommissionPercentage(service);
                
                return (
                  <div key={serviceIndex} className="p-4 border rounded-lg bg-muted/30 space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                      {/* Servicio */}
                      <div className="lg:col-span-3 space-y-2">
                        <Label className="text-sm">Servicio</Label>
                        <Select 
                          value={service.serviceId} 
                          onValueChange={(value) => updateService(serviceIndex, 'serviceId', value)}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione servicio" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableServices.map(s => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.specialtyName} - {s.name} {s.price ? `(Bs. ${s.price})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Precio */}
                      <div className="lg:col-span-2 space-y-2">
                        <Label className="text-sm">Precio Unitario (Bs.)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={service.price || ''}
                          onChange={(e) => updateService(serviceIndex, 'price', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          onWheel={(e) => e.currentTarget.blur()}
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          disabled={isSubmitting}
                        />
                      </div>

                      {/* Cantidad */}
                      <div className="lg:col-span-2 space-y-2">
                        <Label className="text-sm">Cantidad</Label>
                        <Input
                          type="number"
                          step="1"
                          min="1"
                          value={service.quantity || ''}
                          onChange={(e) => {
                            if (e.target.value === '') {
                              updateService(serviceIndex, 'quantity', '');
                            } else {
                              updateService(serviceIndex, 'quantity', parseFloat(e.target.value) || 1);
                            }
                          }}
                          placeholder="1"
                          onWheel={(e) => e.currentTarget.blur()}
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          disabled={isSubmitting}
                        />
                      </div>

                      {/* Comisiones - IDÉNTICO A QUOTATIONSFORM */}
                      <div className="lg:col-span-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-sm">Comisiones</Label>
                          {service.serviceId && (
                            <span className={`text-xs ${
                              serviceCommissionsTotal > serviceSubtotal
                                ? 'text-red-600 font-bold' 
                                : 'text-muted-foreground'
                            }`}>
                              Total: {totalServiceCommissionPercentage.toFixed(1)}%
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {service.commissions.map((commission) => {
                            const doctor = doctors.find(d => d.id === commission.doctorId);
                            if (!doctor) return null;

                            return (
                              <div key={commission.doctorId} className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded border">
                                <span className="text-xs font-medium whitespace-nowrap">
                                  {doctor.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleCommissionType(serviceIndex, commission.doctorId)}
                                  className="text-xs px-1 py-0.5 bg-blue-100 rounded hover:bg-blue-200"
                                  title={commission.commissionType === 'percentage' ? 'Cambiar a monto fijo' : 'Cambiar a porcentaje'}
                                >
                                  {commission.commissionType === 'percentage' ? '%' : 'Bs'}
                                </button>
                                {commission.commissionType === 'percentage' ? (
                                  <>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max="100"
                                      value={commission.percentage || ''}
                                      onChange={(e) => updateCommission(serviceIndex, commission.doctorId, parseFloat(e.target.value) || 0, 'percentage')}
                                      placeholder="%"
                                      onWheel={(e) => e.currentTarget.blur()}
                                      className="w-12 h-6 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      disabled={isSubmitting}
                                    />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">%</span>
                                  </>
                                ) : (
                                  <>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max={serviceSubtotal}
                                      value={commission.amount || ''}
                                      onChange={(e) => updateCommission(serviceIndex, commission.doctorId, parseFloat(e.target.value) || 0, 'amount')}
                                      placeholder="Bs"
                                      onWheel={(e) => e.currentTarget.blur()}
                                      className="w-16 h-6 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      disabled={isSubmitting}
                                    />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">Bs</span>
                                  </>
                                )}
                                <span className="text-xs font-semibold text-green-600 whitespace-nowrap ml-1">
                                  Bs. {commission.amount.toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                          {service.commissions.length === 0 && (
                            <span className="text-xs text-muted-foreground italic">
                              No hay comisiones para este servicio
                            </span>
                          )}
                        </div>
                        {serviceCommissionsTotal > serviceSubtotal && (
                          <p className="text-xs text-red-600 font-medium">
                            ⚠️ Las comisiones no pueden superar el total del servicio
                          </p>
                        )}
                      </div>

                      {/* Eliminar */}
                      <div className="lg:col-span-1 flex justify-end">
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="icon"
                          onClick={() => removeService(serviceIndex)}
                          className="h-8 w-8"
                          disabled={isSubmitting}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Resumen del servicio */}
                    {service.serviceId && (
                      <div className="grid grid-cols-3 gap-4 text-sm border-t pt-3">
                        <div>
                          <span className="font-medium">Subtotal: </span>
                          <span>Bs. {service.price.toFixed(2)} x {service.quantity} = Bs. {serviceSubtotal.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="font-medium">Comisiones: </span>
                          <span className="text-red-600">Bs. {serviceCommissionsTotal.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="font-medium">Neto: </span>
                          <span className="text-green-600">Bs. {serviceNetTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="space-y-4">
              <Label>Método de Pago</Label>
              <Select 
                value={paymentMethod} 
                onValueChange={(value: 'QR' | 'Efectivo' | 'Mixto') => {
                  setPaymentMethod(value);
                  if (value === 'Efectivo') {
                    setCashAmount(total);
                    setQrAmount(0);
                  } else if (value === 'QR') {
                    setCashAmount(0);
                    setQrAmount(total);
                  } else {
                    setCashAmount(Math.floor(total / 2));
                    setQrAmount(Math.ceil(total / 2));
                  }
                }}
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

              {paymentMethod === 'Mixto' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label>Efectivo (Bs.)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={cashAmount || ''}
                      onChange={(e) => handleCashAmountChange(parseFloat(e.target.value) || 0)}
                      placeholder="Monto en efectivo"
                      onWheel={(e) => e.currentTarget.blur()}
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>QR (Bs.)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={qrAmount || ''}
                      onChange={(e) => handleQrAmountChange(parseFloat(e.target.value) || 0)}
                      placeholder="Monto por QR"
                      onWheel={(e) => e.currentTarget.blur()}
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t">
              <div className="text-xl font-bold">
                Total a Cobrar: Bs. {total.toFixed(2)}
              </div>
              <Button 
                type="submit" 
                size="lg" 
                className="w-full sm:w-auto" 
                disabled={loading || isSubmitting}
              >
                {loading ? 'Procesando...' : 'Registrar Consulta'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  ¿Desea registrar esta consulta de <strong>{patientName}</strong> por un total de <strong>Bs. {total.toFixed(2)}</strong>?
                </p>
                {hasCommissions && (
                  <div>
                    <div className="font-medium text-sm mb-2">Comisiones a generar:</div>
                    {renderCommissionDetails()}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading || isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmit} disabled={loading || isSubmitting}>
              {loading ? 'Procesando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}