import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export interface Service {
  id: string;
  name: string;
  hasFixedPrice: boolean;
  price?: number;
}

export interface Specialty {
  id: string;
  name: string;
  services: Service[];
}

export interface ServiceRequest {
  id?: string; // ID opcional para servicios existentes
  nombre: string;
  precio: number;
}

export interface SpecialtyRequest {
  nombre: string;
  servicios: ServiceRequest[];
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Obtener todas las especialidades con sus servicios
export const getSpecialties = async (): Promise<Specialty[]> => {
  try {
    const response = await api.get<Specialty[]>("/specialties/specialties");
    return response.data;
  } catch (error: any) {
    console.error("Error fetching specialties:", error.response?.data || error.message);
    throw new Error(error.response?.data?.error || "No se pudieron cargar las especialidades");
  }
};

// Crear una nueva especialidad con sus servicios
export const createSpecialty = async (specialty: SpecialtyRequest): Promise<Specialty> => {
  try {
    const response = await api.post<Specialty>("/specialties/specialties", specialty);
    return response.data;
  } catch (error: any) {
    console.error("Error creating specialty:", error.response?.data || error.message);
    throw new Error(error.response?.data?.error || "No se pudo crear la especialidad");
  }
};

// Actualizar una especialidad y sus servicios
export const updateSpecialty = async (id: string, specialty: SpecialtyRequest): Promise<Specialty> => {
  try {
    const response = await api.put<Specialty>(`/specialties/specialties/${id}`, specialty);
    return response.data;
  } catch (error: any) {
    console.error("Error updating specialty:", error.response?.data || error.message);
    throw new Error(error.response?.data?.error || "No se pudo actualizar la especialidad");
  }
};

// Eliminar una especialidad (eliminación lógica)
export const deleteSpecialty = async (id: string): Promise<void> => {
  try {
    await api.patch(`/specialties/specialties/${id}/update-status`);
  } catch (error: any) {
    console.error("Error deleting specialty:", error.response?.data || error.message);
    throw new Error(error.response?.data?.error || "No se pudo eliminar la especialidad");
  }
};

// Obtener servicios de una especialidad específica
export const getSpecialtyServices = async (specialtyId: string): Promise<Service[]> => {
  try {
    const response = await api.get<Service[]>(`/specialties/specialties/${specialtyId}/services`);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching specialty services:", error.response?.data || error.message);
    throw new Error(error.response?.data?.error || "No se pudieron cargar los servicios de la especialidad");
  }
};