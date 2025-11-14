import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendMovement {
  idmovimiento_caja: number;
  idcaja: number;
  idusuario: number;
  monto: string;
  tipo: 'ingreso' | 'egreso';
  descripcion: string;
  monto_anterior: string;
  monto_actual: string;
  fecha: string;
  usuario?: string;
  caja_nombre?: string;
}

export interface Movement {
  idmovimiento_caja: number;
  idcaja: number;
  idusuario: number;
  monto: number;
  tipo: 'ingreso' | 'egreso';
  descripcion: string;
  monto_anterior: number;
  monto_actual: number;
  fecha: string;
  usuario?: string;
  caja_nombre?: string;
}

export interface MovementRequest {
  idcaja: number;
  idusuario: number;
  monto: number;
  tipo: 'ingreso' | 'egreso';
  descripcion: string;
}

interface BackendCashBox {
  idcaja: number;
  nombre: string;
  total: string;
}

export interface CashBox {
  idcaja: number;
  nombre: string;
  total: number;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getMovements = async (): Promise<Movement[]> => {
  try {
    const response = await api.get<BackendMovement[]>("/movements/movements");
    return response.data.map((movement) => ({
      idmovimiento_caja: movement.idmovimiento_caja,
      idcaja: movement.idcaja,
      idusuario: movement.idusuario,
      monto: parseFloat(movement.monto),
      tipo: movement.tipo,
      descripcion: movement.descripcion,
      monto_anterior: parseFloat(movement.monto_anterior),
      monto_actual: parseFloat(movement.monto_actual),
      fecha: movement.fecha,
      usuario: movement.usuario,
      caja_nombre: movement.caja_nombre,
    }));
  } catch (error) {
    console.error("Error fetching movements:", error);
    throw new Error("No se pudieron cargar los movimientos");
  }
};

export const getCashBoxes = async (): Promise<CashBox[]> => {
  try {
    const response = await api.get<BackendCashBox[]>("/movements/cashboxes");
    return response.data.map((cashbox) => ({
      idcaja: cashbox.idcaja,
      nombre: cashbox.nombre,
      total: parseFloat(cashbox.total),
    }));
  } catch (error) {
    console.error("Error fetching cash boxes:", error);
    throw new Error("No se pudieron cargar las cajas");
  }
};

export const createMovement = async (
  movement: MovementRequest
): Promise<Movement> => {
  try {
    const response = await api.post<BackendMovement>("/movements/movements", {
      idcaja: movement.idcaja,
      idusuario: movement.idusuario,
      monto: movement.monto.toString(),
      tipo: movement.tipo,
      descripcion: movement.descripcion,
    });
    return mapBackendMovement(response.data);
  } catch (error) {
    console.error("Error creating movement:", error);
    throw new Error("No se pudo registrar el movimiento");
  }
};

export const getCashBoxBalance = async (idcaja: number): Promise<number> => {
  try {
    const response = await api.get<{ total: string }>(`/movements/cashboxes/${idcaja}/balance`);
    return parseFloat(response.data.total);
  } catch (error) {
    console.error("Error fetching cash box balance:", error);
    throw new Error("No se pudo obtener el saldo de la caja");
  }
};

function mapBackendMovement(movement: BackendMovement): Movement {
  return {
    idmovimiento_caja: movement.idmovimiento_caja,
    idcaja: movement.idcaja,
    idusuario: movement.idusuario,
    monto: parseFloat(movement.monto),
    tipo: movement.tipo,
    descripcion: movement.descripcion,
    monto_anterior: parseFloat(movement.monto_anterior),
    monto_actual: parseFloat(movement.monto_actual),
    fecha: movement.fecha,
    usuario: movement.usuario,
    caja_nombre: movement.caja_nombre,
  };
}