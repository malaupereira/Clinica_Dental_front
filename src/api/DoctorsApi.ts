import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendDoctor {
  iddoctor: number;
  nombre: string;
  tipo_pago: 'Comision' | 'Sueldo';
  estado: number;
}

interface BackendDoctorSpecialty {
  iddoctor_especialidad: number;
  iddoctor: number;
  idespecialidad: number;
}

export interface Doctor {
  id: string;
  name: string;
  specialtyIds: string[];
  paymentType: 'comision' | 'sueldo';
}

export interface DoctorRequest {
  name: string;
  specialtyIds: string[];
  paymentType: 'comision' | 'sueldo';
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getDoctors = async (): Promise<Doctor[]> => {
  try {
    const response = await api.get<BackendDoctor[]>("/doctors/doctors");
    const doctors = response.data;

    // Obtener las especialidades de cada doctor
    const doctorsWithSpecialties = await Promise.all(
      doctors.map(async (doctor) => {
        if (doctor.estado === 1) return null; // Saltar doctores eliminados
        
        try {
          const specialtiesResponse = await api.get<BackendDoctorSpecialty[]>(
            `/doctors/doctors/${doctor.iddoctor}/specialties`
          );
          
          return {
            id: doctor.iddoctor.toString(),
            name: doctor.nombre,
            specialtyIds: specialtiesResponse.data.map(spec => spec.idespecialidad.toString()),
            paymentType: doctor.tipo_pago.toLowerCase() as 'comision' | 'sueldo'
          };
        } catch (error) {
          console.error(`Error fetching specialties for doctor ${doctor.iddoctor}:`, error);
          return {
            id: doctor.iddoctor.toString(),
            name: doctor.nombre,
            specialtyIds: [],
            paymentType: doctor.tipo_pago.toLowerCase() as 'comision' | 'sueldo'
          };
        }
      })
    );

    return doctorsWithSpecialties.filter(doctor => doctor !== null) as Doctor[];
  } catch (error) {
    console.error("Error fetching doctors:", error);
    throw new Error("No se pudieron cargar los doctores");
  }
};

export const createDoctor = async (doctor: DoctorRequest): Promise<Doctor> => {
  try {
    // Crear el doctor
    const response = await api.post<BackendDoctor>("/doctors/doctors", {
      nombre: doctor.name,
      tipo_pago: doctor.paymentType === 'comision' ? 'Comision' : 'Sueldo'
    });

    const newDoctor = response.data;

    // Asignar especialidades
    if (doctor.specialtyIds.length > 0) {
      await Promise.all(
        doctor.specialtyIds.map(specialtyId =>
          api.post(`/doctors/doctors/${newDoctor.iddoctor}/specialties`, {
            idespecialidad: parseInt(specialtyId)
          })
        )
      );
    }

    return {
      id: newDoctor.iddoctor.toString(),
      name: newDoctor.nombre,
      specialtyIds: doctor.specialtyIds,
      paymentType: newDoctor.tipo_pago.toLowerCase() as 'comision' | 'sueldo'
    };
  } catch (error) {
    console.error("Error creating doctor:", error);
    throw new Error("No se pudo crear el doctor");
  }
};

export const updateDoctor = async (id: string, doctor: DoctorRequest): Promise<Doctor> => {
  try {
    // Actualizar datos básicos del doctor
    const response = await api.put<BackendDoctor>(`/doctors/doctors/${id}`, {
      nombre: doctor.name,
      tipo_pago: doctor.paymentType === 'comision' ? 'Comision' : 'Sueldo'
    });

    const updatedDoctor = response.data;

    // Obtener las especialidades actuales
    const currentSpecialties = await api.get<BackendDoctorSpecialty[]>(
      `/doctors/doctors/${id}/specialties`
    );

    // Identificar especialidades a eliminar
    const currentSpecialtyIds = currentSpecialties.data.map(spec => spec.idespecialidad.toString());
    const specialtiesToRemove = currentSpecialtyIds.filter(
      specId => !doctor.specialtyIds.includes(specId)
    );

    // Eliminar especialidades que ya no están seleccionadas
    await Promise.all(
      specialtiesToRemove.map(specialtyId =>
        api.delete(`/doctors/doctors/${id}/specialties/${specialtyId}`)
      )
    );

    // Agregar nuevas especialidades
    const specialtiesToAdd = doctor.specialtyIds.filter(
      specId => !currentSpecialtyIds.includes(specId)
    );

    await Promise.all(
      specialtiesToAdd.map(specialtyId =>
        api.post(`/doctors/doctors/${id}/specialties`, {
          idespecialidad: parseInt(specialtyId)
        })
      )
    );

    return {
      id: updatedDoctor.iddoctor.toString(),
      name: updatedDoctor.nombre,
      specialtyIds: doctor.specialtyIds,
      paymentType: updatedDoctor.tipo_pago.toLowerCase() as 'comision' | 'sueldo'
    };
  } catch (error) {
    console.error("Error updating doctor:", error);
    throw new Error("No se pudo actualizar el doctor");
  }
};  

export const deleteDoctor = async (id: string): Promise<void> => {
  try {
    await api.delete(`/doctors/doctors/${id}`);
  } catch (error) {
    console.error("Error deleting doctor:", error);
    throw new Error("No se pudo eliminar el doctor");
  }
};