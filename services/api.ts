import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ⚠️ IMPORTANTE: Configuración de API
// En desarrollo: usa tu IP local (solo si el backend está corriendo localmente)
// En producción: usa la URL de tu servidor
const LOCAL_IP = 'localhost'; // IP local para desarrollo
// Si defines EXPO_PUBLIC_API_URL en .env, la app usará esa URL (útil si tu API está en otra ruta)
const PRODUCTION_API_URL =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) ||
  'https://premioclick.cl/api'; // API en servidor propio (cPanel)

// Variable para forzar uso de producción (útil cuando el backend está desplegado)
// Cambia a false solo si quieres usar el backend local
const FORCE_PRODUCTION = true; // Usar backend de producción

// Para emulador Android usa 10.0.2.2, para dispositivo físico usa tu IP
const getApiUrl = () => {
  // Si se fuerza producción, usar URL de producción (o la de .env)
  if (FORCE_PRODUCTION) {
    return PRODUCTION_API_URL.replace(/\/$/, ''); // quitar barra final si la tiene
  }

  // Si hay variable de entorno de producción, usarla
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    return String(process.env.EXPO_PUBLIC_API_URL).replace(/\/$/, '');
  }

  // Desarrollo: usar IP local
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return `http://${LOCAL_IP}:3001/api`;
    }
    if (Platform.OS === 'ios') {
      return `http://${LOCAL_IP}:3001/api`;
    }
    return `http://${LOCAL_IP}:3001/api`;
  }

  return PRODUCTION_API_URL.replace(/\/$/, '');
};

const API_URL = getApiUrl();


export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 segundos máximo por intento
  headers: {
    'Content-Type': 'application/json',
  },
});

// Función para verificar conectividad
export const testConnection = async () => {
  try {
    const response = await axios.get(`${API_URL.replace('/api', '')}/health`, {
      timeout: 5000,
    });
    return { success: true, data: response.data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Interceptor para agregar token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {}
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para reintentos automáticos y manejo de errores
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Reintentar automáticamente en errores de red o timeout (cold start de Vercel)
    const isNetworkError = !error.response;
    const isTimeout = error.code === 'ECONNABORTED';
    const is5xx = error.response?.status >= 500;

    config._retryCount = config._retryCount || 0;
    const MAX_RETRIES = 2;

    if ((isNetworkError || isTimeout || is5xx) && config._retryCount < MAX_RETRIES) {
      config._retryCount += 1;
      const delay = config._retryCount * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return api(config);
    }


    try {
      if (error.response?.status === 401) {
        try {
          await AsyncStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
        } catch {}
      }
    } catch {}
    return Promise.reject(error);
  }
);

