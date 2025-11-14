import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendUser {
  idusuario: number;
  usuario: string;
  contraseña: string;
  tipo: 'admin' | 'assistant';
}

export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'assistant';
}

export interface UserRequest {
  username: string;
  password: string;
  role: 'admin' | 'assistant';
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getUsers = async (): Promise<User[]> => {
  try {
    const response = await api.get<BackendUser[]>("/users/users");
    return response.data.map((user) => ({
      id: user.idusuario.toString(),
      username: user.usuario,
      password: user.contraseña,
      role: user.tipo,
    }));
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error("No se pudieron cargar los usuarios");
  }
};

export const createUser = async (user: UserRequest): Promise<User> => {
  try {
    const response = await api.post<BackendUser>("/users/users", {
      usuario: user.username,
      contraseña: user.password,
      tipo: user.role,
    });
    return mapBackendUser(response.data);
  } catch (error) {
    console.error("Error creating user:", error);
    throw new Error("No se pudo crear el usuario");
  }
};

export const updateUser = async (id: string, user: UserRequest): Promise<User> => {
  try {
    const response = await api.put<BackendUser>(`/users/users/${id}`, {
      usuario: user.username,
      contraseña: user.password,
      tipo: user.role,
    });
    return mapBackendUser(response.data);
  } catch (error) {
    console.error("Error updating user:", error);
    throw new Error("No se pudo actualizar el usuario");
  }
};

export const deleteUser = async (id: string): Promise<void> => {
  try {
    await api.delete(`/users/users/${id}`);
  } catch (error) {
    console.error("Error deleting user:", error);
    throw new Error("No se pudo eliminar el usuario");
  }
};

function mapBackendUser(user: BackendUser): User {
  return {
    id: user.idusuario.toString(),
    username: user.usuario,
    password: user.contraseña,
    role: user.tipo,
  };
}