import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendClinicRecord {
  idregistro_clinica: number;
  fecha: string;
  idusuario: number;
  paciente: string;
  detalles: string;
  metodo_pago: string;
  monto_total: string;
  monto_efectivo: string;
  monto_qr: string;
  usuario_nombre?: string;
}

interface BackendBatasRecord {
  idregistro_batas: number;
  fecha: string;
  idusuario: number;
  detalles: string;
  metodo_pago: string;
  monto_total: string;
  monto_efectivo: string;
  monto_qr: string;
  usuario_nombre?: string;
}

interface BackendClinicDetail {
  iddetalle_registro_clinica: number;
  idregistro_clinica: number;
  idservicio: number;
  cantidad: number;
  precio_unitario: string;
  subtotal: string;
  servicio_nombre?: string;
}

interface BackendBatasDetail {
  iddetalle_registro_batas: number;
  idregistro_batas: number;
  idproducto: number;
  cantidad: number;
  precio_unitario: string;
  subtotal: string;
  producto_nombre?: string;
}

export interface ClinicRecord {
  id: string;
  fecha: string;
  idusuario: number;
  paciente: string;
  detalles: string;
  metodo_pago: 'Efectivo' | 'QR' | 'Mixto';
  monto_total: number;
  monto_efectivo: number;
  monto_qr: number;
  usuario_nombre?: string;
  detalles_servicios?: ClinicDetail[];
}

export interface BatasRecord {
  id: string;
  fecha: string;
  idusuario: number;
  detalles: string;
  metodo_pago: 'Efectivo' | 'QR' | 'Mixto';
  monto_total: number;
  monto_efectivo: number;
  monto_qr: number;
  usuario_nombre?: string;
  detalles_productos?: BatasDetail[];
}

export interface ClinicDetail {
  id: string;
  idregistro_clinica: string;
  idservicio: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  servicio_nombre?: string;
}

export interface BatasDetail {
  id: string;
  idregistro_batas: string;
  idproducto: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto_nombre?: string;
}

export interface ClinicRecordRequest {
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
  }>;
}

export interface BatasRecordRequest {
  idusuario: number;
  detalles: string;
  metodo_pago: 'Efectivo' | 'QR' | 'Mixto';
  monto_total: number;
  monto_efectivo: number;
  monto_qr: number;
  productos: Array<{
    idproducto: number;
    cantidad: number;
    precio_unitario: number;
  }>;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getClinicRecords = async (): Promise<ClinicRecord[]> => {
  try {
    const response = await api.get<BackendClinicRecord[]>("/records/clinic");
    return response.data.map((record) => ({
      id: record.idregistro_clinica.toString(),
      fecha: record.fecha,
      idusuario: record.idusuario,
      paciente: record.paciente,
      detalles: record.detalles,
      metodo_pago: record.metodo_pago as 'Efectivo' | 'QR' | 'Mixto',
      monto_total: parseFloat(record.monto_total),
      monto_efectivo: parseFloat(record.monto_efectivo),
      monto_qr: parseFloat(record.monto_qr),
      usuario_nombre: record.usuario_nombre
    }));
  } catch (error) {
    console.error("Error fetching clinic records:", error);
    throw new Error("No se pudieron cargar los registros de Dental Studio");
  }
};

export const getBatasRecords = async (): Promise<BatasRecord[]> => {
  try {
    const response = await api.get<BackendBatasRecord[]>("/records/batas");
    return response.data.map((record) => ({
      id: record.idregistro_batas.toString(),
      fecha: record.fecha,
      idusuario: record.idusuario,
      detalles: record.detalles,
      metodo_pago: record.metodo_pago as 'Efectivo' | 'QR' | 'Mixto',
      monto_total: parseFloat(record.monto_total),
      monto_efectivo: parseFloat(record.monto_efectivo),
      monto_qr: parseFloat(record.monto_qr),
      usuario_nombre: record.usuario_nombre
    }));
  } catch (error) {
    console.error("Error fetching batas records:", error);
    throw new Error("No se pudieron cargar los registros de Dr.Dress");
  }
};

export const getClinicRecordDetails = async (id: string): Promise<ClinicDetail[]> => {
  try {
    const response = await api.get<BackendClinicDetail[]>(`/records/clinic/${id}/details`);
    return response.data.map((detail) => ({
      id: detail.iddetalle_registro_clinica.toString(),
      idregistro_clinica: detail.idregistro_clinica.toString(),
      idservicio: detail.idservicio,
      cantidad: detail.cantidad,
      precio_unitario: parseFloat(detail.precio_unitario),
      subtotal: parseFloat(detail.subtotal),
      servicio_nombre: detail.servicio_nombre
    }));
  } catch (error) {
    console.error("Error fetching clinic record details:", error);
    throw new Error("No se pudieron cargar los detalles del registro");
  }
};

export const getBatasRecordDetails = async (id: string): Promise<BatasDetail[]> => {
  try {
    const response = await api.get<BackendBatasDetail[]>(`/records/batas/${id}/details`);
    return response.data.map((detail) => ({
      id: detail.iddetalle_registro_batas.toString(),
      idregistro_batas: detail.idregistro_batas.toString(),
      idproducto: detail.idproducto,
      cantidad: detail.cantidad,
      precio_unitario: parseFloat(detail.precio_unitario),
      subtotal: parseFloat(detail.subtotal),
      producto_nombre: detail.producto_nombre
    }));
  } catch (error) {
    console.error("Error fetching batas record details:", error);
    throw new Error("No se pudieron cargar los detalles del registro");
  }
};

export const createClinicRecord = async (record: ClinicRecordRequest): Promise<ClinicRecord> => {
  try {
    const response = await api.post<BackendClinicRecord>("/records/clinic", record);
    return {
      id: response.data.idregistro_clinica.toString(),
      fecha: response.data.fecha,
      idusuario: response.data.idusuario,
      paciente: response.data.paciente,
      detalles: response.data.detalles,
      metodo_pago: response.data.metodo_pago as 'Efectivo' | 'QR' | 'Mixto',
      monto_total: parseFloat(response.data.monto_total),
      monto_efectivo: parseFloat(response.data.monto_efectivo),
      monto_qr: parseFloat(response.data.monto_qr),
      usuario_nombre: response.data.usuario_nombre
    };
  } catch (error) {
    console.error("Error creating clinic record:", error);
    throw new Error("No se pudo crear el registro de Dental Studio");
  }
};

export const createBatasRecord = async (record: BatasRecordRequest): Promise<BatasRecord> => {
  try {
    const response = await api.post<BackendBatasRecord>("/records/batas", record);
    return {
      id: response.data.idregistro_batas.toString(),
      fecha: response.data.fecha,
      idusuario: response.data.idusuario,
      detalles: response.data.detalles,
      metodo_pago: response.data.metodo_pago as 'Efectivo' | 'QR' | 'Mixto',
      monto_total: parseFloat(response.data.monto_total),
      monto_efectivo: parseFloat(response.data.monto_efectivo),
      monto_qr: parseFloat(response.data.monto_qr),
      usuario_nombre: response.data.usuario_nombre
    };
  } catch (error) {
    console.error("Error creating batas record:", error);
    throw new Error("No se pudo crear el registro de Dr.Dress");
  }
};