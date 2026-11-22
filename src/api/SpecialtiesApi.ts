
import axios from 'axios';

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
  id?: string;
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
    'Content-Type': 'application/json'
  }
});

const errorMessage = (
  error: unknown,
  fallback: string
): Error => {
  if (axios.isAxiosError(error)) {
    return new Error(
      error.response?.data?.error || fallback
    );
  }

  return new Error(fallback);
};

export const getSpecialties = async (): Promise<Specialty[]> => {
  try {
    const response = await api.get<Specialty[]>(
      '/specialties/specialties'
    );

    return response.data;
  } catch (error) {
    throw errorMessage(
      error,
      'No se pudieron cargar las especialidades'
    );
  }
};

export const createSpecialty = async (
  specialty: SpecialtyRequest
): Promise<Specialty> => {
  try {
    const response = await api.post<Specialty>(
      '/specialties/specialties',
      specialty
    );

    return response.data;
  } catch (error) {
    throw errorMessage(
      error,
      'No se pudo crear la especialidad'
    );
  }
};

export const updateSpecialty = async (
  id: string,
  specialty: SpecialtyRequest
): Promise<Specialty> => {
  try {
    const response = await api.put<Specialty>(
      `/specialties/specialties/${id}`,
      specialty
    );

    return response.data;
  } catch (error) {
    throw errorMessage(
      error,
      'No se pudo actualizar la especialidad'
    );
  }
};

export const deleteSpecialty = async (
  id: string
): Promise<void> => {
  try {
    await api.patch(
      `/specialties/specialties/${id}/update-status`
    );
  } catch (error) {
    throw errorMessage(
      error,
      'No se pudo eliminar la especialidad'
    );
  }
};

export const getSpecialtyServices = async (
  specialtyId: string
): Promise<Service[]> => {
  try {
    const response = await api.get<Service[]>(
      `/specialties/specialties/${specialtyId}/services`
    );

    return response.data;
  } catch (error) {
    throw errorMessage(
      error,
      'No se pudieron cargar los servicios de la especialidad'
    );
  }
};
