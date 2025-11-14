import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendProduct {
  idproducto: number;
  nombre: string;
  precio_compra: string;
  precio_venta: string;
  stock: number;
  stock_minimo: number;
  estado: number;
}

export interface Product {
  id: string;
  name: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  type: 'clinic' | 'batas'; // Mantenemos el type pero lo determinamos lógicamente
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
  headers: {
    "Content-Type": "application/json",
  },
});

export const getProducts = async (): Promise<Product[]> => {
  try {
    const response = await api.get<BackendProduct[]>("/sales/products");
    return response.data.map((product) => ({
      id: product.idproducto.toString(),
      name: product.nombre,
      purchasePrice: parseFloat(product.precio_compra),
      salePrice: parseFloat(product.precio_venta),
      stock: product.stock,
      minStock: product.stock_minimo,
      type: 'batas' // Por defecto todos los productos son de tipo batas para Dr.Dress
    }));
  } catch (error) {
    console.error("Error fetching products:", error);
    throw new Error("No se pudieron cargar los productos");
  }
};

export const searchProducts = async (query: string): Promise<Product[]> => {
  try {
    const response = await api.get<BackendProduct[]>(`/sales/products/search?q=${encodeURIComponent(query)}`);
    return response.data.map((product) => ({
      id: product.idproducto.toString(),
      name: product.nombre,
      purchasePrice: parseFloat(product.precio_compra),
      salePrice: parseFloat(product.precio_venta),
      stock: product.stock,
      minStock: product.stock_minimo,
      type: 'batas' // Por defecto todos los productos son de tipo batas para Dr.Dress
    }));
  } catch (error) {
    console.error("Error searching products:", error);
    throw new Error("No se pudieron buscar los productos");
  }
};

export const createSale = async (saleData: SaleRequest): Promise<SaleResponse> => {
  try {
    const response = await api.post<SaleResponse>("/sales", saleData);
    return response.data;
  } catch (error) {
    console.error("Error creating sale:", error);
    throw new Error("No se pudo registrar la venta");
  }
};