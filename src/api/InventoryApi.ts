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
  talla: string | null;
  color: string | null;
}

export interface Product {
  idproducto: number;
  nombre: string;
  precio_compra: number;
  precio_venta: number;
  stock: number;
  stock_minimo: number;
  estado: number;
  talla: string | null;
  color: string | null;
}

export interface ProductRequest {
  nombre: string;
  precio_compra: number;
  precio_venta: number;
  stock: number;
  stock_minimo: number;
  talla?: string | null;
  color?: string | null;
}

export interface ProductStats {
  totalProducts: number;
  lowStockProducts: number;
  totalInvestment: number;
  potentialRevenue: number;
  potentialProfit: number;
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
    const response = await api.get<BackendProduct[]>("/inventory/products");
    return response.data.map((product) => ({
      idproducto: product.idproducto,
      nombre: product.nombre,
      precio_compra: parseFloat(product.precio_compra),
      precio_venta: parseFloat(product.precio_venta),
      stock: product.stock,
      stock_minimo: product.stock_minimo,
      estado: product.estado,
      talla: product.talla,
      color: product.color,
    }));
  } catch (error) {
    console.error("Error fetching products:", error);
    throw new Error("No se pudieron cargar los productos");
  }
};

export const getProductStats = async (): Promise<ProductStats> => {
  try {
    const response = await api.get<ProductStats>("/inventory/stats");
    return response.data;
  } catch (error: any) {
    console.error("Error fetching product stats:", error);
    const errorMessage = error.response?.data?.error || "No se pudieron cargar las estadísticas";
    throw new Error(errorMessage);
  }
};

export const createProduct = async (
  product: ProductRequest
): Promise<Product> => {
  try {
    const response = await api.post<BackendProduct>("/inventory/products", {
      nombre: product.nombre,
      precio_compra: product.precio_compra.toString(),
      precio_venta: product.precio_venta.toString(),
      stock: product.stock,
      stock_minimo: product.stock_minimo,
      talla: product.talla || null,
      color: product.color || null,
    });
    return mapBackendProduct(response.data);
  } catch (error: any) {
    console.error("Error creating product:", error);
    const errorMessage = error.response?.data?.error || "No se pudo crear el producto";
    throw new Error(errorMessage);
  }
};

export const updateProduct = async (
  id: number,
  product: ProductRequest
): Promise<Product> => {
  try {
    const response = await api.put<BackendProduct>(`/inventory/products/${id}`, {
      nombre: product.nombre,
      precio_compra: product.precio_compra.toString(),
      precio_venta: product.precio_venta.toString(),
      stock: product.stock,
      stock_minimo: product.stock_minimo,
      talla: product.talla || null,
      color: product.color || null,
    });
    return mapBackendProduct(response.data);
  } catch (error: any) {
    console.error("Error updating product:", error);
    const errorMessage = error.response?.data?.error || "No se pudo actualizar el producto";
    throw new Error(errorMessage);
  }
};

export const deleteProduct = async (id: number): Promise<void> => {
  try {
    await api.delete(`/inventory/products/${id}`);
  } catch (error: any) {
    console.error("Error deleting product:", error);
    const errorMessage = error.response?.data?.error || "No se pudo eliminar el producto";
    throw new Error(errorMessage);
  }
};

export const addStock = async (id: number, quantity: number): Promise<Product> => {
  try {
    const response = await api.patch<BackendProduct>(`/inventory/products/${id}/stock`, {
      cantidad: quantity
    });
    return mapBackendProduct(response.data);
  } catch (error: any) {
    console.error("Error adding stock:", error);
    const errorMessage = error.response?.data?.error || "No se pudo agregar stock";
    throw new Error(errorMessage);
  }
};

function mapBackendProduct(product: BackendProduct): Product {
  return {
    idproducto: product.idproducto,
    nombre: product.nombre,
    precio_compra: parseFloat(product.precio_compra),
    precio_venta: parseFloat(product.precio_venta),
    stock: product.stock,
    stock_minimo: product.stock_minimo,
    estado: product.estado,
    talla: product.talla,
    color: product.color,
  };
}