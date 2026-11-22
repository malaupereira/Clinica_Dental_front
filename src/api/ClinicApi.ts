// src/api/ClinicApi.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface Service {
  id: string;
  name: string;
  price: number;
  specialtyId: string;
}

export interface DoctorCommission {
  doctorId: string;
  percentage: number;
  amount: number;
}

export interface ServiceWithCommissions {
  serviceId: string;
  specialtyId: string;
  price: number;
  quantity: number;
  commissions: DoctorCommission[];
}

export interface ConsultationRequest {
  idusuario: number;
  paciente: string;
  detalles: string;
  metodo_pago: 'Efectivo' | 'QR' | 'Mixto';
  monto_total: number;
  monto_efectivo: number;
  monto_qr: number;
  servicios: Array<{
    idservicio: number;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    doctores_comisiones?: Array<{
      iddoctor: number;
      porcentaje: number;
      monto_comision: number;
    }>;
  }>;
}

export interface ConsultationResponse {
  id: string;
  success: boolean;
  message: string;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

export const createConsultation = async (
  consultationData: ConsultationRequest
): Promise<ConsultationResponse> => {
  try {
    const response = await api.post<ConsultationResponse>(
      '/clinic/consultations', consultationData
    );
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(error.response.data?.details || error.response.data?.error || 'No se pudo registrar la consulta');
      }
      throw new Error('No se pudo confirmar el registro. Verifica el historial antes de intentar nuevamente para evitar duplicados.');
    }
    throw error;
  }
};
