import { useState, useCallback } from 'react';
import { getErrorMessage, getErrorTitle, getErrorType, ApiError } from '../utils/errorHandler';

export function useErrorHandler() {
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState('Error');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorType, setErrorType] = useState<'error' | 'warning' | 'info'>('error');

  const showError = useCallback((error: ApiError | string) => {
    // Filtrar mensajes técnicos incluso si vienen como string
    const filterTechnicalMessage = (msg: string): string => {
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
        msg.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (isTechnical) {
        if (msg.includes('401') || msg.includes('403')) {
          return 'Credenciales incorrectas. Por favor, verifica tus datos.';
        }
        if (msg.includes('400')) {
          return 'Los datos enviados no son válidos. Por favor, verifica la información.';
        }
        if (msg.includes('timeout') || msg.includes('ECONNABORTED')) {
          return 'El servidor está tardando demasiado. Verifica tu conexión e intenta de nuevo.';
        }
        if (msg.includes('ECONNREFUSED') || msg.includes('Network') || msg.includes('ERR_NETWORK')) {
          return 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
        }
        return 'Error al procesar la solicitud. Por favor, intenta de nuevo.';
      }
      
      return msg;
    };
    
    if (typeof error === 'string') {
      setErrorTitle('Error');
      setErrorMessage(filterTechnicalMessage(error));
      setErrorType('error');
    } else {
      const message = getErrorMessage(error);
      setErrorTitle(getErrorTitle(error));
      setErrorMessage(filterTechnicalMessage(message));
      setErrorType(getErrorType(error));
    }
    setErrorVisible(true);
  }, []);

  const hideError = useCallback(() => {
    setErrorVisible(false);
  }, []);

  return {
    errorVisible,
    errorTitle,
    errorMessage,
    errorType,
    showError,
    hideError,
  };
}
