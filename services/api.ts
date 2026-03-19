import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ⚠️ IMPORTANTE: Configuración de API
// En desarrollo: usa tu IP local (solo si el backend está corriendo localmente)
// En producción: usa la URL de tu servidor
const LOCAL_IP = '192.168.1.48'; // IP local para desarrollo
// Si defines EXPO_PUBLIC_API_URL en .env, la app usará esa URL (útil si tu API está en otra ruta)
const PRODUCTION_API_URL =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) ||
  'https://sorteo-5lh6.vercel.app/api'; // API en Vercel. Debe responder /auth/verify, /sorteos, etc.

// Variable para forzar uso de producción (útil cuando el backend está desplegado)
// Cambia a false solo si quieres usar el backend local
const FORCE_PRODUCTION = true; // Usar backend de producción (cPanel)

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

// Log para debugging (siempre, para ayudar a diagnosticar problemas)
console.log('🔗 URL de la API configurada:', API_URL);
console.log('📱 Plataforma:', Platform.OS);
console.log('🌐 IP local configurada:', LOCAL_IP);
console.log('🔧 Modo desarrollo:', __DEV__);

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 segundos para tolerar cold starts de Vercel
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
    console.error('❌ Error de conexión:', error.message);
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
    } catch (error) {
      console.error('Error al obtener token:', error);
      // No crashear, continuar sin token
    }
    return config;
  },
  (error) => {
    console.error('Error en interceptor de request:', error);
    return Promise.reject(error);
  }
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
    const MAX_RETRIES = 3;

    if ((isNetworkError || isTimeout || is5xx) && config._retryCount < MAX_RETRIES) {
      config._retryCount += 1;
      const delay = config._retryCount * 2000; // 2s, 4s, 6s
      console.log(`🔄 Reintentando (${config._retryCount}/${MAX_RETRIES}) en ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return api(config);
    }

    if (error.response?.status === 404) {
      const url = error.config?.baseURL + (error.config?.url || '');
      console.warn('⚠️ API 404 - Ruta no encontrada:', url);
    }

    try {
      if (error.response?.status === 401) {
        try {
          await AsyncStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
        } catch (storageError) {
          console.error('Error al eliminar token:', storageError);
        }
      }
    } catch (handlerError) {
      console.error('Error en interceptor de response:', handlerError);
    }
    return Promise.reject(error);
  }
);

