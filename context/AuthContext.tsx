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
      console.error('Error en login:', error);
      throw new Error(error.response?.data?.error || 'Error al iniciar sesión. Verifica tu conexión.');
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
      console.error('❌ Error en register:', error);
      console.error('❌ Response status:', error.response?.status);
      console.error('❌ Response data:', JSON.stringify(error.response?.data, null, 2));
      
      // Extraer el mensaje de error del backend
      let errorMessage = 'Error al registrarse. Verifica tu conexión.';
      
      if (error.response?.data) {
        // Intentar diferentes formatos de error del backend
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors.map((e: any) => e.msg || e.message || e).join(', ');
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
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

