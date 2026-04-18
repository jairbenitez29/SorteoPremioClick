import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { AppState, AppStateStatus } from 'react-native';
import { api } from '../services/api';

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutos
const SAVED_EMAIL_KEY = 'saved_email';
const SAVED_PASSWORD_KEY = 'saved_password'; // guardado en SecureStore

interface User {
  id: number;
  nombre: string;
  email: string;
  rol?: 'usuario' | 'admin';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<User>;
  register: (nombre: string, email: string, password: string, telefono?: string) => Promise<User>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (user: User) => void;
  resetInactivityTimer: () => void;
  getSavedCredentials: () => Promise<{ email: string; password: string } | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function cleanErrorMessage(message: string): string {
  if (!message) return 'Error inesperado. Por favor, intenta de nuevo.';

  const technicalPatterns = [
    'AxiosError', 'Request failed', 'status code', 'ECONN', 'ERR_',
    'Network Error', 'timeout', 'ECONNABORTED', 'ECONNREFUSED',
    'ENOTFOUND', 'EAI_AGAIN', 'getaddrinfo', 'socket', 'XMLHttpRequest',
    'fetch', 'axios', 'http://', 'https://', 'localhost', '127.0.0.1',
    'ECONNRESET', 'ETIMEDOUT', 'ENETUNREACH', 'EADDRINUSE'
  ];

  const hasTechnical = technicalPatterns.some(p =>
    message.toLowerCase().includes(p.toLowerCase())
  );

  if (hasTechnical) {
    if (message.includes('401') || message.includes('403'))
      return 'Credenciales incorrectas. Por favor, verifica tus datos.';
    if (message.includes('400'))
      return 'Los datos enviados no son válidos. Por favor, verifica la información.';
    if (message.includes('409'))
      return 'El email ya está registrado. Por favor, usa otro email.';
    if (message.includes('500'))
      return 'Error en el servidor. Por favor, intenta más tarde.';
    if (message.includes('timeout') || message.includes('ECONNABORTED'))
      return 'El servidor está tardando demasiado. Verifica tu conexión e intenta de nuevo.';
    if (message.includes('ECONNREFUSED') || message.includes('Network') || message.includes('ERR_NETWORK'))
      return 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
    return 'Error al procesar la solicitud. Por favor, intenta de nuevo.';
  }

  let cleaned = message
    .replace(/Error \d{3}/gi, 'Error')
    .replace(/status code \d{3}/gi, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/:\s*\d{3}/g, '')
    .trim();

  if (!cleaned || cleaned.length < 5)
    return 'Error inesperado. Por favor, intenta de nuevo.';

  return cleaned;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutRef = useRef<(() => Promise<void>) | null>(null);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(async () => {
      if (logoutRef.current) await logoutRef.current();
    }, INACTIVITY_TIMEOUT);
  }, []);

  useEffect(() => {
    checkAuth();

    // Detectar cuando la app vuelve al primer plano
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        resetInactivityTimer();
      } else if (state === 'background' || state === 'inactive') {
        // Guardar timestamp cuando sale al fondo
        AsyncStorage.setItem('app_background_ts', String(Date.now())).catch(() => {});
      }
    });

    return () => {
      subscription.remove();
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, []);

  // Verificar si estuvo inactivo más de 10 min cuando regresa
  useEffect(() => {
    if (!user) return;
    resetInactivityTimer();

    const subscription = AppState.addEventListener('change', async (state: AppStateStatus) => {
      if (state === 'active') {
        try {
          const ts = await AsyncStorage.getItem('app_background_ts');
          if (ts) {
            const elapsed = Date.now() - parseInt(ts);
            if (elapsed >= INACTIVITY_TIMEOUT) {
              if (logoutRef.current) await logoutRef.current();
              return;
            }
          }
        } catch {}
        resetInactivityTimer();
      } else {
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      }
    });

    return () => subscription.remove();
  }, [user, resetInactivityTimer]);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        try {
          const response = await api.get('/auth/verify', { signal: controller.signal });
          const userData = response.data.user;
          console.log('Usuario verificado:', userData?.email);
          setUser(userData);
        } catch (verifyError: any) {
          console.log('Error al verificar token:', verifyError.message);
          if (verifyError.response?.status === 401 || verifyError.response?.status === 403) {
            await AsyncStorage.removeItem('token');
            delete api.defaults.headers.common['Authorization'];
          }
        } finally {
          clearTimeout(timeoutId);
        }
      }
    } catch (error: any) {
      console.log('Auth check error:', error?.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('app_background_ts');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  }, []);

  // Mantener referencia actualizada para el timer
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  const login = async (email: string, password: string, rememberMe = false) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user: userData } = response.data;

      await AsyncStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);

      if (rememberMe) {
        await AsyncStorage.setItem(SAVED_EMAIL_KEY, email);
        await SecureStore.setItemAsync(SAVED_PASSWORD_KEY, password);
      } else {
        await AsyncStorage.removeItem(SAVED_EMAIL_KEY);
        await SecureStore.deleteItemAsync(SAVED_PASSWORD_KEY).catch(() => {});
      }

      resetInactivityTimer();
      return userData;
    } catch (error: any) {
      if (__DEV__) {
        console.log('Error en login:', { status: error.response?.status });
      }

      let errorMessage = 'Error al iniciar sesión. Verifica tu conexión.';
      if (error.response) {
        const status = error.response.status;
        if (status === 401)
          errorMessage = 'Email o contraseña incorrectos. Por favor, verifica tus credenciales.';
        else if (status === 400)
          errorMessage = 'Los datos enviados no son válidos.';
        else if (status === 500)
          errorMessage = 'Error en el servidor. Por favor, intenta más tarde.';
        else
          errorMessage = 'Error al iniciar sesión. Por favor, intenta de nuevo.';
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'El servidor está tardando demasiado. Verifica tu conexión e intenta de nuevo.';
      } else if (error.request && !error.response) {
        errorMessage = 'No se recibió respuesta del servidor. Verifica tu conexión e intenta de nuevo.';
      }

      const userFriendlyError = new Error(cleanErrorMessage(errorMessage));
      userFriendlyError.stack = undefined;
      throw userFriendlyError;
    }
  };

  const register = async (nombre: string, email: string, password: string, telefono?: string) => {
    try {
      const payload: any = { nombre, email, password };
      if (telefono && telefono.trim() !== '') payload.telefono = telefono.trim();

      const response = await api.post('/auth/register', payload);
      const { token, user: userData } = response.data;

      await AsyncStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);
      resetInactivityTimer();
      return userData;
    } catch (error: any) {
      if (__DEV__) {
        console.log('Error en register:', { status: error.response?.status });
      }

      let errorMessage = 'Error al registrarse. Verifica tu conexión.';
      if (error.response) {
        const status = error.response.status;
        if (status === 400) {
          if (error.response.data?.errors && Array.isArray(error.response.data.errors)) {
            const messages = error.response.data.errors
              .map((e: any) => {
                const msg = e.msg || e.message || '';
                if (msg.includes('email') || msg.includes('Email'))
                  return 'El email ya está registrado o no es válido.';
                if (msg.includes('password') || msg.includes('Password'))
                  return 'La contraseña no cumple los requisitos mínimos.';
                return msg || 'Campo inválido';
              })
              .filter((m: string) => m !== '');
            errorMessage = messages.length > 0 ? messages.join('\n') : 'Los datos enviados no son válidos.';
          } else if (error.response.data?.error) {
            const be = error.response.data.error;
            if (be.includes('email') || be.includes('Email'))
              errorMessage = 'El email ya está registrado. Por favor, usa otro email o inicia sesión.';
            else
              errorMessage = be;
          } else {
            errorMessage = 'Los datos enviados no son válidos.';
          }
        } else if (status === 409) {
          errorMessage = 'El email ya está registrado. Por favor, usa otro email o inicia sesión.';
        } else if (status === 500) {
          errorMessage = 'Error en el servidor. Por favor, intenta más tarde.';
        } else {
          errorMessage = 'Error al registrarse. Por favor, intenta de nuevo.';
        }
      } else if (error.request && !error.response) {
        errorMessage = 'No se recibió respuesta del servidor. Verifica tu conexión.';
      }

      const userFriendlyError = new Error(cleanErrorMessage(errorMessage));
      userFriendlyError.stack = undefined;
      throw userFriendlyError;
    }
  };

  const getSavedCredentials = async (): Promise<{ email: string; password: string } | null> => {
    try {
      const email = await AsyncStorage.getItem(SAVED_EMAIL_KEY);
      const password = await SecureStore.getItemAsync(SAVED_PASSWORD_KEY);
      if (email && password) return { email, password };
    } catch {}
    return null;
  };

  const updateUser = (updatedUser: User) => setUser(updatedUser);

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, logout, checkAuth,
      updateUser, resetInactivityTimer, getSavedCredentials
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined)
    throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
