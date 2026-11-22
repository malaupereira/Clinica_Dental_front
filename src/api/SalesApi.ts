import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface BackendProduct {
  idproducto: number;
  nombre: string;
  precio_compra: string;
  precio_venta: string;
  stock: number;
  stock_minimo: number;
  estado: number;
  talla?: string;
  color?: string;
  stock_bodega?: number;
}

export interface Product {
  id: string;
  name: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  type: 'clinic' | 'batas';
  talla?: string;
  color?: string;
  warehouseStock?: number;
}

export interface SaleRequest {
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

export interface SaleResponse {
  id: string;
  success: boolean;
  message: string;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const parseProduct = (product: BackendProduct): Product => ({
  id: String(product.idproducto),
  name: product.nombre,
  purchasePrice: Number(product.precio_compra),
  salePrice: Number(product.precio_venta),
  stock: Number(product.stock),
  minStock: Number(product.stock_minimo),
  type: 'batas',
  talla: product.talla || undefined,
  color: product.color || undefined,
  warehouseStock: Number(product.stock_bodega ?? 0),
});

const getError = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    if (!error.response) return new Error('No se pudo confirmar la operación con el servidor. Revisa el historial antes de volver a intentar.');
    return new Error(error.response.data?.error || fallback);
  }
  return error instanceof Error ? error : new Error(fallback);
};

export const getProducts = async (): Promise<Product[]> => {
  try {
    const response = await api.get<BackendProduct[]>('/sales/products');
    return response.data.map(parseProduct);
  } catch (error) {
    throw getError(error, 'No se pudieron cargar los productos');
  }
};

export const searchProducts = async (term: string): Promise<Product[]> => {
  try {
    const response = await api.get<BackendProduct[]>('/sales/products/search', { params: { q: term } });
    return response.data.map(parseProduct);
  } catch (error) {
    throw getError(error, 'No se pudieron buscar los productos');
  }
};

export const createSale = async (saleData: SaleRequest): Promise<SaleResponse> => {
  try {
    const response = await api.post<SaleResponse>('/sales', saleData);
    return response.data;
  } catch (error) {
    throw getError(error, 'No se pudo registrar la venta');
  }
};
  