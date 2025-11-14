import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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

interface BackendExpense {
  idegreso: number;
  tipo: string;
  descripcion: string;
  monto: string;
  fecha: string;
  usuario?: string;
  estado: string;
}

export interface Expense {
  idegreso: number;
  tipo: string;
  descripcion: string;
  monto: number;
  fecha: string;
  usuario?: string;
  estado: string;
}

interface CashSummary {
  balance: number;
  income: number;
  outcome: number;
  transactionsCount: number;
  expensesCount: number;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getCashBoxes = async (): Promise<CashBox[]> => {
  try {
    const response = await api.get<BackendCashBox[]>("/cash/cashboxes");
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

export const getCashSummary = async (idcaja: number, fecha?: string, fechaInicio?: string, fechaFin?: string): Promise<CashSummary> => {
  try {
    const params: any = { idcaja };
    
    if (fecha) {
      params.fecha = fecha;
    }
    
    if (fechaInicio && fechaFin) {
      params.fechaInicio = fechaInicio;
      params.fechaFin = fechaFin;
    }

    const response = await api.get<CashSummary>("/cash/summary", { params });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching cash summary:", error);
    const errorMessage = error.response?.data?.error || "No se pudo obtener el resumen de caja";
    throw new Error(errorMessage);
  }
};

export const getMovementsByCashBox = async (idcaja: number, fecha?: string, fechaInicio?: string, fechaFin?: string): Promise<Movement[]> => {
  try {
    const params: any = { idcaja };
    
    if (fecha) {
      params.fecha = fecha;
    }
    
    if (fechaInicio && fechaFin) {
      params.fechaInicio = fechaInicio;
      params.fechaFin = fechaFin;
    }

    const response = await api.get<BackendMovement[]>("/cash/movements", { params });
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
  } catch (error: any) {
    console.error("Error fetching movements:", error);
    const errorMessage = error.response?.data?.error || "No se pudieron cargar los movimientos";
    throw new Error(errorMessage);
  }
};

export const getExpensesByCashBox = async (idcaja: number, fecha?: string, fechaInicio?: string, fechaFin?: string): Promise<Expense[]> => {
  try {
    const params: any = { idcaja };
    
    if (fecha) {
      params.fecha = fecha;
    }
    
    if (fechaInicio && fechaFin) {
      params.fechaInicio = fechaInicio;
      params.fechaFin = fechaFin;
    }

    const response = await api.get<BackendExpense[]>("/cash/expenses", { params });
    return response.data.map((expense) => ({
      idegreso: expense.idegreso,
      tipo: expense.tipo,
      descripcion: expense.descripcion,
      monto: parseFloat(expense.monto),
      fecha: expense.fecha,
      usuario: expense.usuario,
      estado: expense.estado,
    }));
  } catch (error: any) {
    console.error("Error fetching expenses:", error);
    const errorMessage = error.response?.data?.error || "No se pudieron cargar los gastos";
    throw new Error(errorMessage);
  }
};

export const getAllMovementsWithExpenses = async (idcaja: number, fecha?: string, fechaInicio?: string, fechaFin?: string) => {
  try {
    const [movements, expenses] = await Promise.all([
      getMovementsByCashBox(idcaja, fecha, fechaInicio, fechaFin),
      getExpensesByCashBox(idcaja, fecha, fechaInicio, fechaFin)
    ]);

    return {
      movements,
      expenses
    };
  } catch (error) {
    console.error("Error fetching all data:", error);
    throw new Error("No se pudieron cargar los datos de caja");
  }
};