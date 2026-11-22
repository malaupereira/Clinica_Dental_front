import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendExpense {
  idgasto: number;
  fecha: string;
  categoria: 'clinic' | 'batas';
  tipo: string;
  descripcion?: string | null;
  monto: string | number;
  iddoctor: number | null;
  estado: 'pending' | 'completed' | 'deleted';
  doctor_nombre?: string | null;
}

interface BackendDoctor {
  iddoctor: number;
  nombre: string;
}

interface BoxBalanceResponse {
  clinic: number;
  clinicQr: number;
  batas: number;
  batasQr: number;
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
  descripcion?: string;
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
  headers: { "Content-Type": "application/json" }
});

const mapExpense = (expense: BackendExpense): Expense => ({
  id: String(expense.idgasto),
  type: expense.tipo,
  doctor: expense.doctor_nombre || '',
  description: expense.descripcion || '',
  amount: Number(expense.monto),
  category: expense.categoria,
  status: expense.estado,
  createdDate: expense.fecha,
  date: expense.fecha,
  isCommission: expense.tipo === 'Pago Comisión Doctores'
});

const apiError = (error: unknown, fallback: string): Error => {
  if (axios.isAxiosError(error)) {
    return new Error(error.response?.data?.error || fallback);
  }
  return new Error(fallback);
};

export const getExpenses = async (): Promise<Expense[]> => {
  try {
    const response = await api.get<BackendExpense[]>('/expenses');
    return response.data.map(mapExpense);
  } catch (error) {
    throw apiError(error, 'No se pudieron cargar los gastos');
  }
};

export const createExpense = async (expense: ExpenseRequest): Promise<Expense> => {
  try {
    const response = await api.post<BackendExpense>('/expenses', expense);
    return mapExpense(response.data);
  } catch (error) {
    throw apiError(error, 'No se pudo crear el gasto');
  }
};

export const updateExpense = async (id: string, expense: ExpenseRequest): Promise<Expense> => {
  try {
    const response = await api.put<BackendExpense>(`/expenses/${id}`, expense);
    return mapExpense(response.data);
  } catch (error) {
    throw apiError(error, 'No se pudo actualizar el gasto');
  }
};

export const deleteExpense = async (id: string): Promise<void> => {
  try {
    await api.patch(`/expenses/${id}/status`, { estado: 'deleted' });
  } catch (error) {
    throw apiError(error, 'No se pudo eliminar el gasto');
  }
};

export const payExpense = async (paymentData: PaymentRequest): Promise<void> => {
  try {
    await api.post('/expenses/pay', paymentData);
  } catch (error) {
    throw apiError(error, 'No se pudo procesar el pago');
  }
};

export const payCommissionGroup = async (paymentData: CommissionPaymentRequest): Promise<void> => {
  try {
    await api.post('/expenses/pay-commission-group', paymentData);
  } catch (error) {
    throw apiError(error, 'No se pudo procesar el pago de comisiones');
  }
};

export const getDoctors = async (): Promise<BackendDoctor[]> => {
  try {
    const response = await api.get<BackendDoctor[]>('/expenses/doctors');
    return response.data;
  } catch (error) {
    throw apiError(error, 'No se pudieron cargar los doctores');
  }
};

export const getBoxBalances = async (): Promise<BoxBalanceResponse> => {
  try {
    const response = await api.get<BoxBalanceResponse>('/expenses/box-balances');
    return response.data;
  } catch (error) {
    throw apiError(error, 'No se pudieron cargar los saldos de las cajas');
  }
};
