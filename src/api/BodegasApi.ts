// src/api/BodegasApi.ts
import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendBodega {
  idbodega: number;
  idproducto: number;
  stock_bodega: number;
  stock_minimo_bodega: number;
  nombre?: string;
  precio_compra?: string;
  precio_venta?: string;
  talla?: string;
  color?: string;
}

interface BackendProduct {
  idproducto: number;
  nombre: string;
  precio_compra: string;
  precio_venta: string;
  stock: number;
  stock_minimo: number;
  talla: string | null;
  color: string | null;
  estado: number;
}

export interface BodegaProduct {
  idbodega: number;
  idproducto: number;
  nombre: string;
  precio_compra: number;
  precio_venta: number;
  stock: number; // Stock en tabla producto
  stock_minimo: number; // Stock mínimo en tabla producto
  stock_bodega: number; // Stock en bodega
  stock_minimo_bodega: number; // Stock mínimo en bodega
  talla: string | null;
  color: string | null;
  estado: number;
}

export interface ProductStats {
  totalProducts: number;
  lowStockProducts: number;
  totalInvestment: number;
  potentialRevenue: number;
  potentialProfit: number;
}

export interface BodegaProductRequest {
  nombre: string;
  precio_compra: number;
  precio_venta: number;
  stock: number;
  stock_minimo: number;
  stock_bodega: number;
  stock_minimo_bodega: number;
  talla: string | null;
  color: string | null;
}

export interface TransferRequest {
  idproducto: number;
  cantidad: number;
  tipo: 'entrada' | 'salida'; // entrada: bodega -> inventario, salida: inventario -> bodega
}

// Nueva interfaz para transferencia directa desde tabla
export interface DirectTransferRequest {
  idproducto: number;
  cantidad: number;
  tipo: 'entrada' | 'salida';
  // Campos adicionales para feedback inmediato
  currentStock?: number;
  currentBodegaStock?: number;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Obtener todos los productos en bodega
export const getBodegaProducts = async (): Promise<BodegaProduct[]> => {
  try {
    const response = await api.get<BackendBodega[]>("/bodegas/bodega-products");
    return response.data.map((item) => ({
      idbodega: item.idbodega,
      idproducto: item.idproducto,
      nombre: item.nombre || '',
      precio_compra: parseFloat(item.precio_compra || '0'),
      precio_venta: parseFloat(item.precio_venta || '0'),
      stock: 0, // Este valor vendrá del endpoint específico
      stock_minimo: 0,
      stock_bodega: item.stock_bodega,
      stock_minimo_bodega: item.stock_minimo_bodega,
      talla: item.talla || null,
      color: item.color || null,
      estado: 1
    }));
  } catch (error) {
    console.error("Error fetching bodega products:", error);
    throw new Error("No se pudieron cargar los productos en bodega");
  }
};

// Obtener productos con información completa
export const getProductsWithInventory = async (): Promise<BodegaProduct[]> => {
  try {
    const response = await api.get<BodegaProduct[]>("/bodegas/full-products");
    return response.data;
  } catch (error) {
    console.error("Error fetching full products:", error);
    throw new Error("No se pudieron cargar los productos con inventario");
  }
};

// Obtener estadísticas
export const getBodegaStats = async (): Promise<ProductStats> => {
  try {
    const response = await api.get<ProductStats>("/bodegas/stats");
    return response.data;
  } catch (error) {
    console.error("Error fetching bodega stats:", error);
    throw new Error("No se pudieron cargar las estadísticas");
  }
};

// Crear producto y registrarlo en bodega
export const createBodegaProduct = async (
  product: BodegaProductRequest
): Promise<BodegaProduct> => {
  try {
    const response = await api.post<BodegaProduct>("/bodegas/products", product);
    return response.data;
  } catch (error) {
    console.error("Error creating bodega product:", error);
    throw new Error("No se pudo crear el producto en bodega");
  }
};

// Actualizar producto y bodega
export const updateBodegaProduct = async (
  id: number,
  product: BodegaProductRequest
): Promise<BodegaProduct> => {
  try {
    const response = await api.put<BodegaProduct>(`/bodegas/products/${id}`, product);
    return response.data;
  } catch (error) {
    console.error("Error updating bodega product:", error);
    throw new Error("No se pudo actualizar el producto en bodega");
  }
};

// Eliminar producto (cambia estado)
export const deleteBodegaProduct = async (id: number): Promise<void> => {
  try {
    await api.delete(`/bodegas/products/${id}`);
  } catch (error) {
    console.error("Error deleting bodega product:", error);
    throw new Error("No se pudo eliminar el producto de bodega");
  }
};

// Agregar stock a bodega
export const addBodegaStock = async (
  id: number,
  cantidad: number
): Promise<BodegaProduct> => {
  try {
    const response = await api.patch<BodegaProduct>(`/bodegas/products/${id}/add-stock`, { cantidad });
    return response.data;
  } catch (error) {
    console.error("Error adding bodega stock:", error);
    throw new Error("No se pudo agregar stock a la bodega");
  }
};

// Transferir stock entre bodega e inventario
export const transferStock = async (
  transfer: TransferRequest
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.post("/bodegas/transfer", transfer);
    return response.data;
  } catch (error) {
    console.error("Error transferring stock:", error);
    throw new Error("No se pudo transferir el stock");
  }
};

// Nueva función para transferencia directa desde tabla
export const directTransferStock = async (
  transfer: DirectTransferRequest
): Promise<{ success: boolean; message: string; updatedProduct?: BodegaProduct }> => {
  try {
    const response = await api.post("/bodegas/direct-transfer", transfer);
    return response.data;
  } catch (error) {
    console.error("Error in direct transfer:", error);
    throw new Error("No se pudo realizar la transferencia");
  }
};

// Obtener productos disponibles para transferir al inventario
export const getTransferableProducts = async (): Promise<BodegaProduct[]> => {
  try {
    const response = await api.get<BodegaProduct[]>("/bodegas/transferable");
    return response.data;
  } catch (error) {
    console.error("Error fetching transferable products:", error);
    throw new Error("No se pudieron cargar los productos transferibles");
  }
};