/**
 * Utilidad para formatear y mostrar errores de forma amigable
 */

export interface ApiError {
  response?: {
    status?: number;
    statusText?: string;
    data?: {
      error?: string;
      message?: string;
      errors?: Array<{ msg?: string; message?: string; field?: string }>;
      details?: string;
    };
  };
  message?: string;
  code?: string;
  request?: any;
}

/**
 * Obtiene un mensaje de error amigable desde un error de la API
 */
export function getErrorMessage(error: ApiError): string {
  // Si hay respuesta del servidor
  if (error.response?.data) {
    const data = error.response.data;
    const status = error.response?.status;

    // Mensajes específicos por código de estado
    if (status === 400) {
      if (data.error) return data.error;
      if (data.message) return data.message;
      if (data.errors && Array.isArray(data.errors)) {
        return data.errors.map(e => e.msg || e.message || 'Campo inválido').join('\n');
      }
      return 'Los datos enviados no son válidos. Por favor, verifica la información.';
    }

    if (status === 401) {
      // Si es un error de login/registro, mensaje específico
      const url = error.response?.config?.url || '';
      if (url.includes('/auth/login')) {
        return 'Email o contraseña incorrectos. Por favor, verifica tus credenciales e intenta de nuevo.';
      }
      if (url.includes('/auth/register')) {
        return 'No se pudo crear la cuenta. Verifica que el email no esté ya registrado.';
      }
      return 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
    }

    if (status === 403) {
      return 'No tienes permisos para realizar esta acción.';
    }

    if (status === 404) {
      return 'No se encontró el recurso solicitado.';
    }

    if (status === 409) {
      return data.error || data.message || 'Ya existe un registro con esta información.';
    }

    if (status === 422) {
      if (data.errors && Array.isArray(data.errors)) {
        const messages = data.errors.map(e => {
          const field = e.field ? `${e.field}: ` : '';
          return `${field}${e.msg || e.message || 'Campo inválido'}`;
        });
        return messages.join('\n');
      }
      return data.error || data.message || 'Los datos enviados no son válidos.';
    }

    if (status === 500) {
      return 'Error en el servidor. Por favor, intenta más tarde o contacta al soporte.';
    }

    if (status === 503) {
      return 'El servidor está temporalmente no disponible. Por favor, intenta más tarde.';
    }

    // Mensaje genérico del servidor
    if (data.error) return data.error;
    if (data.message) return data.message;
    if (data.details) return data.details;
    if (data.errors && Array.isArray(data.errors)) {
      return data.errors.map(e => e.msg || e.message || 'Error de validación').join('\n');
    }

    return `Error del servidor (${status}). Por favor, intenta más tarde.`;
  }

  // Errores de conexión
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return 'El servidor está tardando demasiado en responder.\n\nPor favor, verifica tu conexión a internet e intenta de nuevo.';
  }

  if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error') || error.message?.includes('ERR_NETWORK')) {
    return 'No se pudo conectar al servidor.\n\nVerifica:\n• Tu conexión a internet\n• Que el servidor esté disponible\n• Intenta de nuevo en unos momentos';
  }

  if (error.request && !error.response) {
    return 'No se recibió respuesta del servidor.\n\nVerifica tu conexión a internet e intenta de nuevo.';
  }

  // Mensaje genérico - NUNCA mostrar información técnica
  if (error.message) {
    // Filtrar TODOS los mensajes técnicos
    const technicalPatterns = [
      'AxiosError',
      'Request failed',
      'status code',
      'ECONN',
      'ERR_',
      'Network Error',
      'timeout',
      'ECONNABORTED',
      'ECONNREFUSED',
      'ENOTFOUND',
      'EAI_AGAIN',
      'getaddrinfo',
      'socket',
      'XMLHttpRequest',
      'fetch',
    ];
    
    const isTechnical = technicalPatterns.some(pattern => 
      error.message?.toLowerCase().includes(pattern.toLowerCase())
    );
    
    if (isTechnical) {
      // Determinar tipo de error técnico y dar mensaje apropiado
      if (error.message.includes('timeout') || error.message.includes('ECONNABORTED')) {
        return 'El servidor está tardando demasiado en responder. Por favor, verifica tu conexión e intenta de nuevo.';
      }
      if (error.message.includes('ECONNREFUSED') || error.message.includes('Network') || error.message.includes('ERR_NETWORK')) {
        return 'No se pudo conectar al servidor. Verifica tu conexión a internet e intenta de nuevo.';
      }
      if (error.message.includes('401') || error.message.includes('403')) {
        return 'Credenciales incorrectas o sin permisos. Por favor, verifica tus datos.';
      }
      if (error.message.includes('400')) {
        return 'Los datos enviados no son válidos. Por favor, verifica la información.';
      }
      if (error.message.includes('500')) {
        return 'Error en el servidor. Por favor, intenta más tarde.';
      }
      // Mensaje genérico para cualquier otro error técnico
      return 'Error al procesar la solicitud. Por favor, intenta de nuevo.';
    }
    
    // Si no es técnico, verificar que no contenga códigos de error
    if (/\d{3}/.test(error.message) && error.message.length < 50) {
      // Parece un código de error, usar mensaje genérico
      return 'Error al procesar la solicitud. Por favor, intenta de nuevo.';
    }
    
    return error.message;
  }

  return 'Ocurrió un error inesperado. Por favor, intenta de nuevo o contacta al soporte.';
}

/**
 * Obtiene un título apropiado para el error
 */
export function getErrorTitle(error: ApiError): string {
  const status = error.response?.status;

  if (status === 400) return 'Datos Inválidos';
  if (status === 401) return 'Sesión Expirada';
  if (status === 403) return 'Sin Permisos';
  if (status === 404) return 'No Encontrado';
  if (status === 409) return 'Conflicto';
  if (status === 422) return 'Validación Fallida';
  if (status === 500) return 'Error del Servidor';
  if (status === 503) return 'Servicio No Disponible';

  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return 'Tiempo de Espera Agotado';
  }

  if (error.code === 'ECONNREFUSED' || error.message?.includes('Network')) {
    return 'Error de Conexión';
  }

  return 'Error';
}

/**
 * Determina el tipo de error para el componente visual
 */
export function getErrorType(error: ApiError): 'error' | 'warning' | 'info' {
  const status = error.response?.status;

  if (status === 401 || status === 403) return 'warning';
  if (status === 404 || status === 409) return 'info';
  if (error.code === 'ECONNABORTED' || error.code === 'ECONNREFUSED') return 'warning';

  return 'error';
}
