import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Interfaces para productos menos vendidos
export interface LeastSoldProduct {
  idproducto: number;
  nombre: string;
  total_vendido: number;
  stock_actual: number;
  precio: number;
}

// Interfaces para productos con bajo stock
export interface LowStockProduct {
  idproducto: number;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  precio: number;
  necesita_reorden: boolean;
}

// Interfaces para datos de reportes
export interface ReportsData {
  total_ingresos: number;
  total_egresos: number;
  balance: number;
  ingresos_clinica: number;
  ingresos_batas: number;
  egresos_clinica: number;
  egresos_batas: number;
  ventas_totales: number;
  productos_vendidos: number;
  servicios_vendidos: number;
  metodo_pago: {
    efectivo: number;
    qr: number;
    mixto: number;
  };
  tendencia_ventas: Array<{
    fecha: string;
    ingresos: number;
    egresos: number;
  }>;
  productos_populares: Array<{
    idproducto: number;
    nombre: string;
    cantidad_vendida: number;
    total_ventas: number;
  }>;
  servicios_populares: Array<{
    idservicio: number;
    nombre: string;
    cantidad_vendida: number;
    total_ventas: number;
  }>;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Obtener datos de reportes
export const getReportsData = async (
  period: 'day' | 'range' | 'week' | 'month', 
  dateRange: { start: string; end: string }, 
  productType: 'clinic' | 'batas'
): Promise<ReportsData> => {
  try {
    const response = await api.get<ReportsData>("/reports/data", {
      params: {
        period,
        startDate: dateRange.start,
        endDate: dateRange.end,
        productType
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching reports data:", error);
    // Retornar datos vacíos en caso de error
    return {
      total_ingresos: 0,
      total_egresos: 0,
      balance: 0,
      ingresos_clinica: 0,
      ingresos_batas: 0,
      egresos_clinica: 0,
      egresos_batas: 0,
      ventas_totales: 0,
      productos_vendidos: 0,
      servicios_vendidos: 0,
      metodo_pago: {
        efectivo: 0,
        qr: 0,
        mixto: 0
      },
      tendencia_ventas: [],
      productos_populares: [],
      servicios_populares: []
    };
  }
};

// Obtener productos con bajo stock
export const getLowStockProducts = async (): Promise<LowStockProduct[]> => {
  try {
    const response = await api.get<LowStockProduct[]>("/reports/low-stock");
    return response.data;
  } catch (error) {
    console.error("Error fetching low stock products:", error);
    return [];
  }
};

// Obtener productos menos vendidos
export const getLeastSoldProducts = async (): Promise<LeastSoldProduct[]> => {
  try {
    const response = await api.get<LeastSoldProduct[]>("/reports/least-sold");
    return response.data;
  } catch (error) {
    console.error("Error fetching least sold products:", error);
    return [];
  }
};

// Obtener reporte de ventas por período
export const getSalesReport = async (startDate: string, endDate: string) => {
  try {
    const response = await api.get("/reports/sales", {
      params: { startDate, endDate }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching sales report:", error);
    throw new Error("No se pudo generar el reporte de ventas");
  }
};

// Obtener reporte de gastos por período
export const getExpensesReport = async (startDate: string, endDate: string) => {
  try {
    const response = await api.get("/reports/expenses", {
      params: { startDate, endDate }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching expenses report:", error);
    throw new Error("No se pudo generar el reporte de gastos");
  }
};

// Obtener reporte de comisiones
export const getCommissionsReport = async (startDate: string, endDate: string) => {
  try {
    const response = await api.get("/reports/commissions", {
      params: { startDate, endDate }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching commissions report:", error);
    throw new Error("No se pudo generar el reporte de comisiones");
  }
};

// Obtener reporte de inventario
export const getInventoryReport = async () => {
  try {
    const response = await api.get("/reports/inventory");
    return response.data;
  } catch (error) {
    console.error("Error fetching inventory report:", error);
    throw new Error("No se pudo generar el reporte de inventario");
  }
};