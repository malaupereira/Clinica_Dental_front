// src/api/QuotationsApi.ts
import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendQuotation {
  idcotizacion: number;
  fecha: string;
  paciente: string;
  telefono: string;
  estado: string;
  total: string;
  total_pendiente: string;
  idusuario: number;
  usuario_nombre?: string;
}

interface BackendQuotationService {
  idcotizacion_servicio: number;
  idcotizacion: number;
  idservicio: number;
  precio: string;
  nombre_servicio: string;
  nombre_especialidad: string;
  idespecialidad: number;
}

interface BackendQuotationCommission {
  idcotizacion_comision_doctor: number;
  idcotizacion_servicio: number;
  iddoctor: number;
  porcentaje: string;
  total_comision: string;
  comision_pendiente: string;
  nombre_doctor: string;
}

export interface Quotation {
  id: string;
  date: string;
  clientName: string;
  phone: string;
  status: 'pendiente' | 'completado' | 'eliminado';
  total: number;
  pendingAmount: number;
  userId: number;
  userName?: string;
  services: QuotationService[];
  payments: QuotationPayment[];
}

export interface QuotationService {
  id: string;
  serviceId: string;
  serviceName: string;
  specialtyId: string;
  specialtyName: string;
  price: number;
  commissions: ServiceCommission[];
}

export interface ServiceCommission {
  id: string;
  doctorId: string;
  doctorName: string;
  percentage: number;
  amount: number;
  pendingAmount: number;
}

export interface QuotationPayment {
  id: string;
  date: string;
  amount: number;
  paymentMethod: 'Efectivo' | 'QR' | 'Mixto';
  details: string;
  doctorCommissions: { [key: string]: number };
}

export interface QuotationRequest {
  clientName: string;
  phone: string;
  date: string;
  services: Omit<QuotationService, 'id'>[];
  total: number;
  selectedSpecialties: string[];
  selectedDoctors: string[];
}

export interface PaymentRequest {
  quotationId: string;
  amount: number;
  paymentMethod: 'Efectivo' | 'QR' | 'Mixto';
  cashAmount?: number;
  qrAmount?: number;
  doctorCommissions: { [key: string]: number };
  userId: number;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getQuotations = async (): Promise<Quotation[]> => {
  try {
    const response = await api.get<BackendQuotation[]>("/quotations/quotations");
    const quotations = response.data;

    // Obtener detalles completos para cada cotización
    const quotationsWithDetails = await Promise.all(
      quotations.map(async (quotation) => {
        const services = await getQuotationServices(quotation.idcotizacion);
        const payments = await getQuotationPayments(quotation.idcotizacion);
        
        return mapBackendQuotation(quotation, services, payments);
      })
    );

    return quotationsWithDetails;
  } catch (error) {
    console.error("Error fetching quotations:", error);
    throw new Error("No se pudieron cargar las cotizaciones");
  }
};

export const getQuotationById = async (id: string): Promise<Quotation> => {
  try {
    const response = await api.get<BackendQuotation>(`/quotations/quotations/${id}`);
    const quotation = response.data;
    
    const services = await getQuotationServices(quotation.idcotizacion);
    const payments = await getQuotationPayments(quotation.idcotizacion);
    
    return mapBackendQuotation(quotation, services, payments);
  } catch (error) {
    console.error("Error fetching quotation:", error);
    throw new Error("No se pudo cargar la cotización");
  }
};

export const createQuotation = async (quotation: QuotationRequest): Promise<Quotation> => {
  try {
    const response = await api.post<BackendQuotation>("/quotations/quotations", quotation);
    const newQuotation = response.data;
    
    // Obtener servicios y pagos (vacíos para nueva cotización)
    const services = await getQuotationServices(newQuotation.idcotizacion);
    
    return mapBackendQuotation(newQuotation, services, []);
  } catch (error) {
    console.error("Error creating quotation:", error);
    throw new Error("No se pudo crear la cotización");
  }
};

export const updateQuotation = async (id: string, quotation: QuotationRequest): Promise<Quotation> => {
  try {
    const response = await api.put<BackendQuotation>(`/quotations/quotations/${id}`, quotation);
    const updatedQuotation = response.data;
    
    const services = await getQuotationServices(updatedQuotation.idcotizacion);
    const payments = await getQuotationPayments(updatedQuotation.idcotizacion);
    
    return mapBackendQuotation(updatedQuotation, services, payments);
  } catch (error) {
    console.error("Error updating quotation:", error);
    throw new Error("No se pudo actualizar la cotización");
  }
};

export const deleteQuotation = async (id: string): Promise<void> => {
  try {
    await api.patch(`/quotations/quotations/${id}/status`, { status: 'eliminado' });
  } catch (error) {
    console.error("Error deleting quotation:", error);
    throw new Error("No se pudo eliminar la cotización");
  }
};

export const registerPayment = async (payment: PaymentRequest): Promise<Quotation> => {
  try {
    console.log("Enviando pago al backend:", payment);
    const response = await api.post<BackendQuotation>("/quotations/quotations/payment", payment);
    const updatedQuotation = response.data;
    console.log("Respuesta del backend después del pago:", updatedQuotation);
    
    const services = await getQuotationServices(updatedQuotation.idcotizacion);
    const payments = await getQuotationPayments(updatedQuotation.idcotizacion);
    
    return mapBackendQuotation(updatedQuotation, services, payments);
  } catch (error) {
    console.error("Error registering payment:", error);
    throw new Error("No se pudo registrar el pago");
  }
};

// Funciones auxiliares
const getQuotationServices = async (quotationId: number): Promise<BackendQuotationService[]> => {
  try {
    const response = await api.get<BackendQuotationService[]>(`/quotations/quotations/${quotationId}/services`);
    return response.data;
  } catch (error) {
    console.error("Error fetching quotation services:", error);
    return [];
  }
};

const getQuotationPayments = async (quotationId: number): Promise<any[]> => {
  try {
    const response = await api.get(`/quotations/quotations/${quotationId}/payments`);
    return response.data;
  } catch (error) {
    console.error("Error fetching quotation payments:", error);
    return [];
  }
};

const getQuotationCommissions = async (serviceId: number): Promise<BackendQuotationCommission[]> => {
  try {
    const response = await api.get<BackendQuotationCommission[]>(`/quotations/quotations/services/${serviceId}/commissions`);
    return response.data;
  } catch (error) {
    console.error("Error fetching service commissions:", error);
    return [];
  }
};

function mapBackendQuotation(
  quotation: BackendQuotation, 
  services: BackendQuotationService[], 
  payments: any[]
): Quotation {
  return {
    id: quotation.idcotizacion.toString(),
    date: quotation.fecha,
    clientName: quotation.paciente,
    phone: quotation.telefono,
    status: quotation.estado as 'pendiente' | 'completado' | 'eliminado',
    total: parseFloat(quotation.total),
    pendingAmount: parseFloat(quotation.total_pendiente),
    userId: quotation.idusuario,
    userName: quotation.usuario_nombre,
    services: services.map(service => ({
      id: service.idcotizacion_servicio.toString(),
      serviceId: service.idservicio.toString(),
      serviceName: service.nombre_servicio,
      specialtyId: service.idespecialidad.toString(),
      specialtyName: service.nombre_especialidad,
      price: parseFloat(service.precio),
      commissions: [] // Se llenará después
    })),
    payments: payments || []
  };
}

// Función para cargar comisiones de servicios
export const loadServiceCommissions = async (quotation: Quotation): Promise<Quotation> => {
  const servicesWithCommissions = await Promise.all(
    quotation.services.map(async (service) => {
      const commissions = await getQuotationCommissions(parseInt(service.id));
      return {
        ...service,
        commissions: commissions.map(comm => ({
          id: comm.idcotizacion_comision_doctor.toString(),
          doctorId: comm.iddoctor.toString(),
          doctorName: comm.nombre_doctor,
          percentage: parseFloat(comm.porcentaje),
          amount: parseFloat(comm.total_comision),
          pendingAmount: parseFloat(comm.comision_pendiente)
        }))
      };
    })
  );

  return {
    ...quotation,
    services: servicesWithCommissions
  };
};