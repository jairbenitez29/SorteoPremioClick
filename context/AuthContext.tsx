import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

interface User {
  id: number;
  nombre: string;
  email: string;
  rol?: 'usuario' | 'admin';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (nombre: string, email: string, password: string, telefono?: string) => Promise<User>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Función para limpiar mensajes técnicos - NUNCA mostrar información técnica al usuario
function cleanErrorMessage(message: string): string {
  if (!message) return 'Error inesperado. Por favor, intenta de nuevo.';
  
  // Lista completa de patrones técnicos a filtrar
  const technicalPatterns = [
    'AxiosError', 'Request failed', 'status code', 'ECONN', 'ERR_', 
    'Network Error', 'timeout', 'ECONNABORTED', 'ECONNREFUSED',
    'ENOTFOUND', 'EAI_AGAIN', 'getaddrinfo', 'socket', 'XMLHttpRequest',
    'fetch', 'axios', 'http://', 'https://', 'localhost', '127.0.0.1',
    'ECONNRESET', 'ETIMEDOUT', 'ENETUNREACH', 'EADDRINUSE'
  ];
  
  // Verificar si contiene información técnica
  const hasTechnical = technicalPatterns.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (hasTechnical) {
    // Si contiene información técnica, determinar el tipo de error y dar mensaje apropiado
    if (message.includes('401') || message.includes('403')) {
      return 'Credenciales incorrectas. Por favor, verifica tus datos.';
    }
    if (message.includes('400')) {
      return 'Los datos enviados no son válidos. Por favor, verifica la información.';
    }
    if (message.includes('409')) {
      return 'El email ya está registrado. Por favor, usa otro email.';
    }
    if (message.includes('500')) {
      return 'Error en el servidor. Por favor, intenta más tarde.';
    }
    if (message.includes('timeout') || message.includes('ECONNABORTED')) {
      return 'El servidor está tardando demasiado. Verifica tu conexión e intenta de nuevo.';
    }
    if (message.includes('ECONNREFUSED') || message.includes('Network') || message.includes('ERR_NETWORK')) {
      return 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
    }
    // Mensaje genérico para cualquier otro error técnico
    return 'Error al procesar la solicitud. Por favor, intenta de nuevo.';
  }
  
  // Limpiar cualquier código de error que pueda quedar (solo si está en formato técnico)
  let cleaned = message
    .replace(/Error \d{3}/gi, 'Error') // "Error 401" -> "Error"
    .replace(/status code \d{3}/gi, '') // "status code 400" -> ""
    .replace(/\[.*?\]/g, '') // Eliminar corchetes con información técnica
    .replace(/\(.*?\)/g, '') // Eliminar paréntesis con información técnica
    .replace(/:\s*\d{3}/g, '') // ": 400" -> ""
    .trim();
  
  // Si después de limpiar queda vacío o muy corto, usar mensaje genérico
  if (!cleaned || cleaned.length < 5) {
    return 'Error inesperado. Por favor, intenta de nuevo.';
  }
  
  return cleaned;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        // Agregar timeout para evitar que se quede colgado
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout
        
        try {
          const response = await api.get('/auth/verify', {
            signal: controller.signal
          });
          const userData = response.data.user;
          console.log('🔍 Usuario verificado (checkAuth):', userData);
          console.log('🔍 Rol del usuario:', userData.rol);
          setUser(userData);
        } catch (verifyError: any) {
          // Si hay error de conexión, simplemente no autenticamos pero no crasheamos
          console.log('⚠️ Error al verificar token (puede ser problema de conexión):', verifyError.message);
          if (verifyError.code !== 'ERR_CANCELED' && verifyError.code !== 'ERR_NETWORK' && verifyError.code !== 'ECONNABORTED') {
            // Solo eliminar token si es un error de autenticación, no de conexión
            if (verifyError.response?.status === 401 || verifyError.response?.status === 403) {
              await AsyncStorage.removeItem('token');
              delete api.defaults.headers.common['Authorization'];
            }
          }
        } finally {
          clearTimeout(timeoutId);
        }
      }
    } catch (error: any) {
      // Error al leer AsyncStorage o cualquier otro error - no crashear
      console.log('⚠️ Auth check error (no crítico):', error?.message || error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      await AsyncStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      return user; // Retornar el usuario para que el login pueda verificar el rol
    } catch (error: any) {
      // Log técnico solo en consola (no se muestra al usuario)
      // Usar console.log en lugar de console.error para evitar que se capture como Snackbar
      if (__DEV__) {
        console.log('⚠️ Error en login (solo desarrollo):', {
          status: error.response?.status,
          message: error.message?.substring(0, 50) // Solo primeros 50 caracteres
        });
      }
      
      // Mensajes amigables según el tipo de error - NUNCA mostrar información técnica
      let errorMessage = 'Error al iniciar sesión. Verifica tu conexión.';
      
      if (error.response) {
        const status = error.response.status;
        if (status === 401) {
          errorMessage = 'Email o contraseña incorrectos. Por favor, verifica tus credenciales.';
        } else if (status === 400) {
          // Filtrar mensajes técnicos del backend
          const backendError = error.response.data?.error || error.response.data?.message || '';
          if (backendError && !backendError.includes('AxiosError') && !backendError.includes('Request failed')) {
            errorMessage = backendError;
          } else {
            errorMessage = 'Los datos enviados no son válidos. Por favor, verifica la información.';
          }
        } else if (status === 500) {
          errorMessage = 'Error en el servidor. Por favor, intenta más tarde.';
        } else if (status === 503) {
          errorMessage = 'El servidor está temporalmente no disponible. Por favor, intenta más tarde.';
        } else {
          // Para otros códigos, usar mensaje genérico
          errorMessage = 'Error al iniciar sesión. Por favor, intenta de nuevo.';
        }
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'El servidor está tardando demasiado. Verifica tu conexión e intenta de nuevo.';
      } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network') || error.message?.includes('ERR_NETWORK')) {
        errorMessage = 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
      } else if (error.request && !error.response) {
        errorMessage = 'No se recibió respuesta del servidor. Verifica tu conexión e intenta de nuevo.';
      }
      
      // Limpiar el mensaje final de CUALQUIER información técnica antes de lanzarlo
      const cleanMessage = cleanErrorMessage(errorMessage);
      
      // Crear un nuevo Error con el mensaje limpio (sin stack trace técnico)
      const userFriendlyError = new Error(cleanMessage);
      // Eliminar el stack trace para evitar información técnica
      userFriendlyError.stack = undefined;
      
      throw userFriendlyError;
    }
  };

  const register = async (nombre: string, email: string, password: string, telefono?: string) => {
    try {
      // Preparar el payload, solo incluir telefono si tiene valor
      const payload: any = { nombre, email, password };
      if (telefono && telefono.trim() !== '') {
        payload.telefono = telefono.trim();
      }
      
      console.log('📤 Enviando registro con payload:', { ...payload, password: '***' });
      
      const response = await api.post('/auth/register', payload);
      const { token, user } = response.data;
      
      await AsyncStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      return user; // Retornar el usuario para que el registro pueda verificar el rol
    } catch (error: any) {
      // Log técnico solo en consola (no se muestra al usuario)
      // Usar console.log en lugar de console.error para evitar que se capture como Snackbar
      if (__DEV__) {
        console.log('⚠️ Error en register (solo desarrollo):', {
          status: error.response?.status,
          message: error.message?.substring(0, 50) // Solo primeros 50 caracteres
        });
      }
      
      // Mensajes amigables según el tipo de error - NUNCA mostrar información técnica
      let errorMessage = 'Error al registrarse. Verifica tu conexión.';
      
      if (error.response) {
        const status = error.response.status;
        if (status === 400) {
          // Error de validación
          if (error.response.data?.errors && Array.isArray(error.response.data.errors)) {
            const messages = error.response.data.errors.map((e: any) => {
              const msg = e.msg || e.message || '';
              // Filtrar mensajes técnicos
              if (msg.includes('AxiosError') || msg.includes('Request failed')) {
                return '';
              }
              if (msg.includes('email') || msg.includes('Email')) {
                return 'El email ya está registrado o no es válido.';
              }
              if (msg.includes('password') || msg.includes('Password')) {
                return 'La contraseña debe tener al menos 6 caracteres.';
              }
              return msg || 'Campo inválido';
            }).filter((m: string) => m !== ''); // Eliminar mensajes vacíos
            errorMessage = messages.length > 0 ? messages.join('\n') : 'Los datos enviados no son válidos.';
          } else if (error.response.data?.error) {
            const backendError = error.response.data.error;
            // Filtrar mensajes técnicos
            if (backendError.includes('AxiosError') || backendError.includes('Request failed')) {
              errorMessage = 'Los datos enviados no son válidos. Por favor, verifica la información.';
            } else if (backendError.includes('email') || backendError.includes('Email')) {
              errorMessage = 'El email ya está registrado. Por favor, usa otro email o inicia sesión.';
            } else {
              errorMessage = backendError;
            }
          } else if (error.response.data?.message) {
            const backendMsg = error.response.data.message;
            // Filtrar mensajes técnicos
            if (backendMsg.includes('AxiosError') || backendMsg.includes('Request failed')) {
              errorMessage = 'Los datos enviados no son válidos. Por favor, verifica la información.';
            } else {
              errorMessage = backendMsg;
            }
          } else {
            errorMessage = 'Los datos enviados no son válidos. Por favor, verifica la información.';
          }
        } else if (status === 409) {
          errorMessage = 'El email ya está registrado. Por favor, usa otro email o inicia sesión.';
        } else if (status === 500) {
          errorMessage = 'Error en el servidor. Por favor, intenta más tarde.';
        } else if (status === 503) {
          errorMessage = 'El servidor está temporalmente no disponible. Por favor, intenta más tarde.';
        } else {
          errorMessage = 'Error al registrarse. Por favor, intenta de nuevo.';
        }
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'El servidor está tardando demasiado. Verifica tu conexión e intenta de nuevo.';
      } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network') || error.message?.includes('ERR_NETWORK')) {
        errorMessage = 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
      } else if (error.request && !error.response) {
        errorMessage = 'No se recibió respuesta del servidor. Verifica tu conexión e intenta de nuevo.';
      }
      
      // Limpiar el mensaje final de CUALQUIER información técnica antes de lanzarlo
      const cleanMessage = cleanErrorMessage(errorMessage);
      
      // Crear un nuevo Error con el mensaje limpio (sin stack trace técnico)
      const userFriendlyError = new Error(cleanMessage);
      // Eliminar el stack trace para evitar información técnica
      userFriendlyError.stack = undefined;
      
      throw userFriendlyError;
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

