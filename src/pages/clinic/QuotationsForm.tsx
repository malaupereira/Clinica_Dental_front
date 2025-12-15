// src/pages/admin/QuotationsForm.tsx
import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

interface SelectedService {
  serviceId: string;
  serviceName: string;
  specialtyId: string;
  specialtyName: string;
  price: number;
  quantity: number;
  commissions: ServiceCommission[];
}

interface ServiceCommission {
  doctorId: string;
  percentage: number;
  amount: number;
  commissionType: 'percentage' | 'amount';
}

interface QuotationsFormProps {
  editingId: string | null;
  quotationData?: any;
  onSubmit: (quotation: any) => void;
  onCancel: () => void;
}

export default function QuotationsForm({ editingId, quotationData, onSubmit, onCancel }: QuotationsFormProps) {
  const { specialties, doctors } = useApp();
  
  // Form state
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with quotation data when editing
  useEffect(() => {
    if (quotationData && editingId) {
      console.log('Loading quotation data:', quotationData);
      setClientName(quotationData.clientName || '');
      setPhone(quotationData.phone || '');
      setDate(quotationData.date || new Date().toISOString().split('T')[0]);
      
      // Cargar especialidades seleccionadas
      const specialtiesFromData = quotationData.selectedSpecialties || 
        Array.from(new Set(quotationData.services.map((s: any) => s.specialtyId)));
      setSelectedSpecialties(specialtiesFromData);
      
      // Cargar doctores seleccionados
      const doctorsFromData = quotationData.selectedDoctors || 
        Array.from(new Set(quotationData.services.flatMap((s: any) => 
          s.commissions.map((c: any) => c.doctorId)
        )));
      setSelectedDoctors(doctorsFromData);
      
      // Cargar servicios CON CANTIDAD
      setSelectedServices(quotationData.services.map((service: any) => ({
        serviceId: service.serviceId,
        serviceName: service.serviceName,
        specialtyId: service.specialtyId,
        specialtyName: service.specialtyName,
        price: Number(service.price) || 0,
        quantity: Number(service.quantity) || 1,
        commissions: service.commissions.map((comm: any) => ({
          doctorId: comm.doctorId,
          percentage: Number(comm.percentage) || 0,
          amount: Number(comm.amount) || 0,
          commissionType: comm.commissionType || 'percentage'
        }))
      })));
    } else {
      // Reset for new quotation - fecha automática de hoy
      setClientName('');
      setPhone('');
      setDate(new Date().toISOString().split('T')[0]);
      setSelectedSpecialties([]);
      setSelectedDoctors([]);
      setSelectedServices([]);
    }
  }, [quotationData, editingId]);

  // Calculate subtotal for a service (price * quantity)
  const calculateServiceSubtotal = (service: SelectedService) => {
    return Math.round(service.price * service.quantity);
  };

  // Calculate total from selected services
  const total = Math.round(selectedServices.reduce((sum, service) => sum + calculateServiceSubtotal(service), 0));

  // Calculate total commissions per doctor
  const doctorCommissions = selectedServices.reduce((acc, service) => {
    const serviceSubtotal = calculateServiceSubtotal(service);
    service.commissions.forEach(commission => {
      if (!acc[commission.doctorId]) {
        acc[commission.doctorId] = 0;
      }
      // Sumar el monto total de la comisión (ya calculado correctamente)
      acc[commission.doctorId] += Math.round(commission.amount);
    });
    return acc;
  }, {} as { [key: string]: number });

  // Calculate total commissions
  const totalCommissions = Math.round(Object.values(doctorCommissions).reduce((sum, amount) => sum + amount, 0));
  const totalNet = total - totalCommissions;

  // Calculate paid amount from existing payments
  const paidAmount = quotationData?.payments?.reduce((sum: number, payment: any) => sum + payment.amount, 0) || 0;
  const pendingAmount = total - paidAmount;

  // Calculate paid commissions per doctor
  const getPaidCommissionsPerDoctor = () => {
    const paidCommissions: { [key: string]: number } = {};
    
    quotationData?.payments?.forEach((payment: any) => {
      Object.keys(payment.doctorCommissions || {}).forEach(doctorId => {
        if (!paidCommissions[doctorId]) {
          paidCommissions[doctorId] = 0;
        }
        paidCommissions[doctorId] += payment.doctorCommissions[doctorId];
      });
    });
    
    return paidCommissions;
  };

  const paidCommissionsPerDoctor = getPaidCommissionsPerDoctor();

  // Available services based on selected specialties
  const availableServices = specialties
    .filter(s => selectedSpecialties.includes(s.id))
    .flatMap(s => s.services.map(service => ({ 
      ...service, 
      specialtyId: s.id, 
      specialtyName: s.name 
    })));

  // Filtered doctors based on selected specialties
  const filteredDoctors = doctors.filter(d => 
    (d.specialtyIds || []).some(id => selectedSpecialties.includes(id))
  );

  // Toggle specialty selection
  const toggleSpecialty = (specialtyId: string) => {
    if (isSubmitting) return;
    
    if (selectedSpecialties.includes(specialtyId)) {
      setSelectedSpecialties(selectedSpecialties.filter(id => id !== specialtyId));
      // Remove services from removed specialty
      setSelectedServices(selectedServices.filter(s => s.specialtyId !== specialtyId));
      // Reset doctors when specialties change
      setSelectedDoctors([]);
    } else {
      setSelectedSpecialties([...selectedSpecialties, specialtyId]);
    }
  };

  // Toggle doctor selection
  const toggleDoctor = (doctorId: string) => {
    if (isSubmitting) return;
    
    if (selectedDoctors.includes(doctorId)) {
      setSelectedDoctors(selectedDoctors.filter(id => id !== doctorId));
      // Remove commissions from all services
      setSelectedServices(prev =>
        prev.map(service => ({
          ...service,
          commissions: service.commissions.filter(comm => comm.doctorId !== doctorId)
        }))
      );
    } else {
      setSelectedDoctors([...selectedDoctors, doctorId]);
      // Add commissions to selected services for this doctor
      const doctor = doctors.find(d => d.id === doctorId);
      if (doctor?.paymentType === 'comision') {
        setSelectedServices(prev =>
          prev.map(service => {
            const hasSpecialty = (doctor.specialtyIds || []).includes(service.specialtyId);
            if (hasSpecialty) {
              // Check if commission already exists for this doctor
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
          })
        );
      }
    }
  };

  // Add service
  const addService = () => {
    if (isSubmitting) return;
    
    const newService: SelectedService = {
      serviceId: '',
      serviceName: '',
      specialtyId: '',
      specialtyName: '',
      price: 0,
      quantity: 1,
      commissions: selectedDoctors
        .filter(doctorId => {
          const doctor = doctors.find(d => d.id === doctorId);
          return doctor?.paymentType === 'comision';
        })
        .map(doctorId => ({ doctorId, percentage: 0, amount: 0, commissionType: 'percentage' }))
    };
    setSelectedServices([...selectedServices, newService]);
  };

  // Remove service
  const removeService = (index: number) => {
    if (isSubmitting) return;
    
    setSelectedServices(selectedServices.filter((_, i) => i !== index));
  };

  // Update service
  const updateService = (index: number, field: 'serviceId' | 'price' | 'quantity', value: string | number) => {
    if (isSubmitting) return;
    
    const newServices = [...selectedServices];
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
      // Solo permitir enteros en el precio
      const intValue = Math.round(Number(value) || 0);
      newServices[index].price = intValue;
      // Recalculate commissions when price changes
      newServices[index].commissions = newServices[index].commissions.map(comm => {
        const serviceSubtotal = calculateServiceSubtotal(newServices[index]);
        if (comm.commissionType === 'percentage') {
          const amount = Math.round((serviceSubtotal * comm.percentage) / 100);
          return { ...comm, amount };
        } else {
          // For fixed amount, recalculate based on quantity
          const amountPerUnit = Math.round(comm.amount / newServices[index].quantity);
          const newTotalAmount = Math.round(amountPerUnit * newServices[index].quantity);
          return { ...comm, amount: newTotalAmount };
        }
      });
    } else if (field === 'quantity') {
      // Permitir borrar el valor usando string vacío temporalmente
      if (value === '') {
        newServices[index].quantity = '' as any; // Permitir string vacío temporalmente
      } else {
        const intValue = Math.round(Number(value) || 1);
        if (intValue < 1) {
          toast.error('La cantidad no puede ser menor a 1');
          return;
        }
        newServices[index].quantity = intValue;
        // Recalculate commissions when quantity changes
        newServices[index].commissions = newServices[index].commissions.map(comm => {
          const serviceSubtotal = calculateServiceSubtotal(newServices[index]);
          if (comm.commissionType === 'percentage') {
            const amount = Math.round((serviceSubtotal * comm.percentage) / 100);
            return { ...comm, amount };
          } else {
            // For fixed amount, keep amount per unit constant
            const amountPerUnit = Math.round(comm.amount / (newServices[index].quantity || 1));
            const newTotalAmount = Math.round(amountPerUnit * intValue);
            return { ...comm, amount: newTotalAmount };
          }
        });
      }
    }
    setSelectedServices(newServices);
  };

  // Update commission with type (percentage or amount)
  const updateCommission = (serviceIndex: number, doctorId: string, value: number, type: 'percentage' | 'amount') => {
    if (isSubmitting) return;
    
    const newServices = [...selectedServices];
    const service = newServices[serviceIndex];
    const commissionIndex = service.commissions.findIndex(comm => comm.doctorId === doctorId);
    
    if (commissionIndex !== -1) {
      const serviceSubtotal = calculateServiceSubtotal(service);
      
      if (type === 'percentage') {
        // Validar que no sea mayor a 100%
        if (value > 100) {
          toast.error('El porcentaje no puede ser mayor a 100%');
          return;
        }
        const amount = Math.round((serviceSubtotal * value) / 100);
        newServices[serviceIndex].commissions[commissionIndex] = {
          doctorId,
          percentage: value,
          amount,
          commissionType: 'percentage'
        };
      } else {
        // For fixed amount, ensure it doesn't exceed service subtotal
        const maxAmount = serviceSubtotal;
        if (value > maxAmount) {
          toast.error(`El monto no puede exceder Bs. ${maxAmount}`);
          return;
        }
        // Calculate equivalent percentage for display
        const percentage = serviceSubtotal > 0 ? Math.round((value / serviceSubtotal) * 100) : 0;
        newServices[serviceIndex].commissions[commissionIndex] = {
          doctorId,
          percentage,
          amount: Math.round(value),
          commissionType: 'amount'
        };
      }
      
      setSelectedServices(newServices);
    }
  };

  // Toggle commission type
  const toggleCommissionType = (serviceIndex: number, doctorId: string) => {
    if (isSubmitting) return;
    
    const newServices = [...selectedServices];
    const service = newServices[serviceIndex];
    const commissionIndex = service.commissions.findIndex(comm => comm.doctorId === doctorId);
    
    if (commissionIndex !== -1) {
      const commission = service.commissions[commissionIndex];
      const newType = commission.commissionType === 'percentage' ? 'amount' : 'percentage';
      
      // When switching types, keep the same amount but recalculate percentage
      const serviceSubtotal = calculateServiceSubtotal(service);
      
      if (newType === 'amount') {
        // Switching to amount - keep current amount, calculate percentage
        const percentage = serviceSubtotal > 0 ? Math.round((commission.amount / serviceSubtotal) * 100) : 0;
        newServices[serviceIndex].commissions[commissionIndex] = {
          ...commission,
          commissionType: newType,
          percentage
        };
      } else {
        // Switching to percentage - calculate new amount based on current percentage
        const amount = Math.round((serviceSubtotal * commission.percentage) / 100);
        newServices[serviceIndex].commissions[commissionIndex] = {
          ...commission,
          commissionType: newType,
          amount
        };
      }
      
      setSelectedServices(newServices);
    }
  };

  // Calculate total percentage for a service
  const getTotalCommissionPercentage = (service: SelectedService) => {
    const serviceSubtotal = calculateServiceSubtotal(service);
    if (serviceSubtotal === 0) return 0;
    const totalCommissionAmount = service.commissions.reduce((sum, comm) => sum + comm.amount, 0);
    return Math.round((totalCommissionAmount / serviceSubtotal) * 100);
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      toast.error('La cotización ya está siendo procesada');
      return;
    }

    if (!clientName.trim() || !phone.trim() || selectedServices.length === 0) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }

    // Validar que todos los servicios tengan cantidad válida
    const hasInvalidQuantity = selectedServices.some(service => 
      service.quantity < 1 || !Number.isInteger(service.quantity)
    );

    if (hasInvalidQuantity) {
      toast.error('Por favor ingrese una cantidad válida para todos los servicios (mínimo 1)');
      return;
    }

    // Validar que ningún servicio tenga más de 100% en comisiones
    const hasInvalidCommissions = selectedServices.some(service => {
      const serviceSubtotal = calculateServiceSubtotal(service);
      if (serviceSubtotal === 0) return false;
      const totalCommissionAmount = service.commissions.reduce((sum, comm) => sum + comm.amount, 0);
      return totalCommissionAmount > serviceSubtotal;
    });

    if (hasInvalidCommissions) {
      toast.error('Las comisiones no pueden superar el total del servicio');
      return;
    }

    setIsSubmitting(true);

    // Preserve existing payments when editing
    const existingPayments = quotationData?.payments || [];

    const quotation = {
      id: editingId || Date.now().toString(),
      clientName: clientName.trim(),
      phone: phone.trim(),
      date, // Fecha automática
      services: selectedServices,
      total,
      payments: existingPayments,
      status: pendingAmount > 0 ? 'pendiente' : 'completado',
      selectedSpecialties,
      selectedDoctors,
      totalCommissions,
      totalNet
    };

    onSubmit(quotation);
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="clientName">Nombre del Cliente *</Label>
          <Input
            id="clientName"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Ingrese nombre"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono *</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ingrese teléfono"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Fecha de Cotización *</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            disabled // Fecha no editable, siempre es hoy
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            La fecha se establece automáticamente a hoy
          </p>
        </div>
      </div>

      {/* Especialidades */}
      <div className="space-y-2">
        <Label>Especialidades</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/30">
          {specialties.map(specialty => (
            <div key={specialty.id} className="flex items-center space-x-2">
              <Checkbox
                id={`spec-${specialty.id}`}
                checked={selectedSpecialties.includes(specialty.id)}
                onCheckedChange={() => toggleSpecialty(specialty.id)}
                disabled={isSubmitting}
              />
              <Label htmlFor={`spec-${specialty.id}`} className="cursor-pointer">
                {specialty.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Doctores */}
      {selectedSpecialties.length > 0 && (
        <div className="space-y-2">
          <Label>Doctores</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/30">
            {filteredDoctors.map(doctor => (
              <div key={doctor.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`doctor-${doctor.id}`}
                  checked={selectedDoctors.includes(doctor.id)}
                  onCheckedChange={() => toggleDoctor(doctor.id)}
                  disabled={isSubmitting}
                />
                <Label htmlFor={`doctor-${doctor.id}`} className="cursor-pointer">
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
      )}

      {/* Servicios */}
      {selectedSpecialties.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Servicios Realizados</Label>
            <Button 
              type="button" 
              onClick={addService} 
              size="sm"
              disabled={isSubmitting}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Servicio
            </Button>
          </div>
          
          {selectedServices.map((service, serviceIndex) => {
            const serviceSubtotal = calculateServiceSubtotal(service);
            const totalServiceCommissionAmount = service.commissions.reduce((sum, comm) => sum + comm.amount, 0);
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
                      step="1"
                      min="0"
                      value={service.price || ''}
                      onChange={(e) => updateService(serviceIndex, 'price', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      onWheel={(e) => e.currentTarget.blur()}
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Cantidad - CORREGIDO PARA PERMITIR BORRAR */}
                  <div className="lg:col-span-2 space-y-2">
                    <Label className="text-sm">Cantidad</Label>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      value={service.quantity || ''}
                      onChange={(e) => {
                        // Permitir borrar el valor
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

                  {/* Comisiones */}
                  <div className="lg:col-span-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm">Comisiones</Label>
                      {service.serviceId && (
                        <span className={`text-xs ${
                          totalServiceCommissionAmount > serviceSubtotal
                            ? 'text-red-600 font-bold' 
                            : 'text-muted-foreground'
                        }`}>
                          Total: {totalServiceCommissionPercentage}%
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
                                  step="1"
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
                                  step="1"
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
                              Bs. {commission.amount}
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
                    {totalServiceCommissionAmount > serviceSubtotal && (
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
                      <span>Bs. {service.price} x {service.quantity} = Bs. {serviceSubtotal}</span>
                    </div>
                    <div>
                      <span className="font-medium">Comisiones servicio: </span>
                      <span className="text-red-600">Bs. {totalServiceCommissionAmount}</span>
                    </div>
                    <div>
                      <span className="font-medium">Total Neto servicio: </span>
                      <span className="text-green-600">Bs. {(serviceSubtotal - totalServiceCommissionAmount)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Resumen General */}
      {total > 0 && (
        <div className="border-t pt-4 space-y-4">
          {/* Resumen General */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
            <div className="text-center">
              <Label className="text-sm font-medium">Total Comisiones</Label>
              <div className="text-lg font-bold text-red-600">Bs. {totalCommissions}</div>
            </div>
            <div className="text-center">
              <Label className="text-sm font-medium">Total Neto</Label>
              <div className="text-lg font-bold text-green-600">Bs. {totalNet}</div>
            </div>
            <div className="text-center">
              <Label className="text-sm font-medium">Total General</Label>
              <div className="text-2xl font-bold">Bs. {total}</div>
            </div>
          </div>

          {/* Estado de Pagos */}
          {editingId && quotationData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
              <div className="text-center">
                <Label className="text-sm font-medium">Total Pagado</Label>
                <div className="text-lg font-bold text-blue-600">Bs. {paidAmount}</div>
              </div>
              <div className="text-center">
                <Label className="text-sm font-medium">Total Pendiente</Label>
                <div className="text-lg font-bold text-orange-600">Bs. {pendingAmount}</div>
              </div>
            </div>
          )}

          {/* Comisiones por Doctor */}
          {Object.keys(doctorCommissions).length > 0 && (
            <div className="p-4 border rounded-lg">
              <Label className="text-sm font-medium">Comisiones Totales por Doctor:</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {Object.entries(doctorCommissions).map(([doctorId, amount]) => {
                  const doctor = doctors.find(d => d.id === doctorId);
                  const paidAmount = paidCommissionsPerDoctor[doctorId] || 0;
                  const pendingAmount = amount - paidAmount;
                  
                  return (
                    <div key={doctorId} className="flex justify-between items-center text-sm p-2 border rounded">
                      <div>
                        <span className="font-medium">{doctor?.name}</span>
                        <div className="text-xs text-muted-foreground">
                          Total: Bs. {amount} | Pagado: Bs. {paidAmount} | Pendiente: Bs. {pendingAmount}
                        </div>
                      </div>
                      <span className="font-medium text-red-600">Bs. {amount}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-2 pt-4">
        <Button 
          type="submit" 
          className="flex-1" 
          disabled={selectedServices.length === 0 || isSubmitting}
        >
          {isSubmitting ? 'Procesando...' : (editingId ? 'Actualizar' : 'Crear')} Cotización
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}