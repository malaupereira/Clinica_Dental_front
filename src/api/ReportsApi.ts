// src/api/ReportsApi.ts
import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Interfaces para productos
export interface Product {
  idproducto: number;
  nombre: string;
  precio_compra: number;
  precio_venta: number;
  stock: number;
  stock_minimo: number;
  estado: number;
  talla?: string;
  color?: string;
}

// Interfaces para productos/servicios más vendidos
export interface MostSoldItem {
  idproducto: number; // Puede ser id de producto o servicio
  nombre: string;
  cantidad_vendida: number;
  ingresos_totales: number;
  talla?: string;
  color?: string;
}

// Interfaces para productos con stock bajo
export interface LowStockProduct {
  idproducto: number;
  nombre: string;
  stock: number;
  stock_minimo: number;
  talla?: string;
  color?: string;
}

// Interfaces para productos menos vendidos
export interface LeastSoldProduct {
  idproducto: number;
  nombre: string;
  stock: number;
  ultima_venta: string | null;
  talla?: string;
  color?: string;
}

// Interface principal para reportes
export interface ReportsData {
  mostSoldProducts: MostSoldItem[];
  totalRevenue: number;
  totalSales: number;
}

// Interface para parámetros de filtro
export interface ReportsFilter {
  period: 'day' | 'range' | 'week' | 'month';
  dateRange?: {
    start: string;
    end: string;
  };
  productType: 'clinic' | 'batas';
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Obtener datos para reportes
export const getReportsData = async (
  period: 'day' | 'range' | 'week' | 'month',
  dateRange: { start: string; end: string },
  productType: 'clinic' | 'batas'
): Promise<ReportsData> => {
  try {
    const params: any = {
      period,
      productType
    };

    if (period === 'range' && dateRange.start && dateRange.end) {
      params.startDate = dateRange.start;
      params.endDate = dateRange.end;
    }

    const response = await api.get<ReportsData>("/reports/sales-data", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching reports data:", error);
    throw new Error("No se pudieron cargar los datos de reportes");
  }
};

// Obtener productos con stock bajo
export const getLowStockProducts = async (): Promise<LowStockProduct[]> => {
  try {
    const response = await api.get<LowStockProduct[]>("/reports/low-stock");
    return response.data;
  } catch (error) {
    console.error("Error fetching low stock products:", error);
    throw new Error("No se pudieron cargar los productos con stock bajo");
  }
};

// Obtener productos menos vendidos (últimos 3 meses)
export const getLeastSoldProducts = async (): Promise<LeastSoldProduct[]> => {
  try {
    const response = await api.get<LeastSoldProduct[]>("/reports/least-sold");
    return response.data;
  } catch (error) {
    console.error("Error fetching least sold products:", error);
    throw new Error("No se pudieron cargar los productos menos vendidos");
  }
};

// Obtener todos los productos
export const getProducts = async (): Promise<Product[]> => {
  try {
    const response = await api.get<Product[]>("/reports/products");
    return response.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw new Error("No se pudieron cargar los productos");
  }
};