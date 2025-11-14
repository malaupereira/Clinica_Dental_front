import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendUser {
  idusuario: number;
  usuario: string;
  tipo: string;
}

export interface User {
  idUsuario: number;
  usuario: string;
  tipo: 'admin' | 'assistant';
}

export interface LoginRequest {
  usuario: string;
  contraseña: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para agregar el token a las solicitudes
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

// Función para validar y convertir el tipo de usuario
const validateUserType = (tipo: string): 'admin' | 'assistant' => {
  if (tipo === 'admin' || tipo === 'assistant') {
    return tipo;
  }
  // Si el tipo no es válido, lanzar error o usar un valor por defecto
  console.warn(`Tipo de usuario no válido: ${tipo}, usando 'assistant' por defecto`);
  return 'assistant';
};

export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  try {
    const response = await api.post<{ user: BackendUser; token: string }>("/auth/login", credentials);
    
    // Validar y convertir el tipo de usuario
    const validatedUserType = validateUserType(response.data.user.tipo);
    
    const loginResponse: LoginResponse = {
      user: {
        idUsuario: response.data.user.idusuario,
        usuario: response.data.user.usuario,
        tipo: validatedUserType
      },
      token: response.data.token
    };

    // Guardar en localStorage
    localStorage.setItem('authToken', loginResponse.token);
    localStorage.setItem('userData', JSON.stringify(loginResponse.user));

    return loginResponse;
  } catch (error: any) {
    console.error("Error en login:", error);
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error("Error de conexión al servidor");
  }
};

export const logout = async (): Promise<void> => {
  try {
    await api.post("/auth/logout");
  } catch (error) {
    console.error("Error en logout:", error);
  } finally {
    // Limpiar localStorage independientemente del resultado
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
  }
};

export const getCurrentUser = async (): Promise<User> => {
  try {
    const response = await api.get<BackendUser>("/auth/me");
    
    // Validar y convertir el tipo de usuario
    const validatedUserType = validateUserType(response.data.tipo);
    
    return {
      idUsuario: response.data.idusuario,
      usuario: response.data.usuario,
      tipo: validatedUserType
    };
  } catch (error: any) {
    console.error("Error obteniendo usuario actual:", error);
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      throw new Error("Sesión expirada");
    }
    throw new Error("Error al obtener información del usuario");
  }
};

export const verifyToken = async (): Promise<boolean> => {
  try {
    await api.get("/auth/verify");
    return true;
  } catch (error) {
    return false;
  }
};

// Función para obtener el token almacenado
export const getStoredToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Función para obtener los datos del usuario almacenados
export const getStoredUser = (): User | null => {
  const userData = localStorage.getItem('userData');
  if (userData) {
    try {
      const user = JSON.parse(userData);
      // Validar el tipo al obtener del localStorage también
      return {
        ...user,
        tipo: validateUserType(user.tipo)
      };
    } catch (error) {
      console.error("Error parsing stored user data:", error);
      return null;
    }
  }
  return null;
};