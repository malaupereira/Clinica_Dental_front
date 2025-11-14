import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendExpense {
  idgasto: number;
  fecha: string;
  categoria: string;
  tipo: string;
  monto: string;
  iddoctor: number | null;
  estado: string;
  doctor_nombre?: string;
}

interface BackendDoctor {
  iddoctor: number;
  nombre: string;
}

export interface Expense {
  id: string;
  type: string;
  doctor: string;
  description: string;
  amount: number;
  category: 'clinic' | 'batas';
  status: 'pending' | 'completed' | 'deleted';
  createdDate: string;
  date: string;
  clinicAmount?: number;
  clinicQrAmount?: number;
  batasAmount?: number;
  batasQrAmount?: number;
  paidAmount?: number;
  paidDate?: string;
  isCommission?: boolean;
  isCommissionGroup?: boolean;
}

export interface ExpenseRequest {
  tipo: string;
  categoria: 'clinic' | 'batas';
  monto: number;
  iddoctor?: number;
  estado?: 'pending' | 'completed' | 'deleted';
}

export interface PaymentRequest {
  idgasto: number;
  clinicAmount: number;
  clinicQrAmount: number;
  batasAmount: number;
  batasQrAmount: number;
  idusuario: number;
}

export interface CommissionPaymentRequest {
  doctor: string;
  iddoctor: number;
  clinicAmount: number;
  clinicQrAmount: number;
  batasAmount: number;
  batasQrAmount: number;
  idusuario: number;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getExpenses = async (): Promise<Expense[]> => {
  try {
    const response = await api.get<BackendExpense[]>("/expenses");
    return response.data.map((expense) => ({
      id: expense.idgasto.toString(),
      type: expense.tipo,
      doctor: expense.doctor_nombre || '',
      description: '',
      amount: parseFloat(expense.monto),
      category: expense.categoria as 'clinic' | 'batas',
      status: expense.estado as 'pending' | 'completed' | 'deleted',
      createdDate: expense.fecha,
      date: expense.fecha,
      isCommission: expense.tipo === 'Pago Comisión Doctores'
    }));
  } catch (error) {
    console.error("Error fetching expenses:", error);
    throw new Error("No se pudieron cargar los gastos");
  }
};

export const createExpense = async (expense: ExpenseRequest): Promise<Expense> => {
  try {
    const response = await api.post<BackendExpense>("/expenses", expense);
    return {
      id: response.data.idgasto.toString(),
      type: response.data.tipo,
      doctor: response.data.doctor_nombre || '',
      description: '',
      amount: parseFloat(response.data.monto),
      category: response.data.categoria as 'clinic' | 'batas',
      status: response.data.estado as 'pending' | 'completed' | 'deleted',
      createdDate: response.data.fecha,
      date: response.data.fecha,
      isCommission: response.data.tipo === 'Pago Comisión Doctores'
    };
  } catch (error) {
    console.error("Error creating expense:", error);
    throw new Error("No se pudo crear el gasto");
  }
};

export const updateExpense = async (id: string, expense: ExpenseRequest): Promise<Expense> => {
  try {
    const response = await api.put<BackendExpense>(`/expenses/${id}`, expense);
    return {
      id: response.data.idgasto.toString(),
      type: response.data.tipo,
      doctor: response.data.doctor_nombre || '',
      description: '',
      amount: parseFloat(response.data.monto),
      category: response.data.categoria as 'clinic' | 'batas',
      status: response.data.estado as 'pending' | 'completed' | 'deleted',
      createdDate: response.data.fecha,
      date: response.data.fecha,
      isCommission: response.data.tipo === 'Pago Comisión Doctores'
    };
  } catch (error) {
    console.error("Error updating expense:", error);
    throw new Error("No se pudo actualizar el gasto");
  }
};

export const deleteExpense = async (id: string): Promise<void> => {
  try {
    await api.patch(`/expenses/${id}/status`, { estado: 'deleted' });
  } catch (error) {
    console.error("Error deleting expense:", error);
    throw new Error("No se pudo eliminar el gasto");
  }
};

export const payExpense = async (paymentData: PaymentRequest): Promise<void> => {
  try {
    await api.post("/expenses/pay", paymentData);
  } catch (error) {
    console.error("Error paying expense:", error);
    throw new Error("No se pudo procesar el pago");
  }
};

export const payCommissionGroup = async (paymentData: CommissionPaymentRequest): Promise<void> => {
  try {
    await api.post("/expenses/pay-commission-group", paymentData);
  } catch (error) {
    console.error("Error paying commission group:", error);
    throw new Error("No se pudo procesar el pago de comisiones");
  }
};

export const getDoctors = async (): Promise<BackendDoctor[]> => {
  try {
    const response = await api.get<BackendDoctor[]>("/expenses/doctors");
    return response.data;
  } catch (error) {
    console.error("Error fetching doctors:", error);
    throw new Error("No se pudieron cargar los doctores");
  }
};