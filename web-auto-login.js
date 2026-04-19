/**
 * Script de Auto-Login para Premioclick.cl
 * 
 * Este script debe ser incluido en la página web (premioclick.cl)
 * para manejar el login automático cuando se accede desde la app móvil.
 */

(function() {
  'use strict';

  // API en Vercel
  const API_URL = 'https://sorteo-premio-click.vercel.app/api';
  
  console.log('🔧 Script de auto-login cargado');
  console.log('🔧 URL actual:', window.location.href);
  console.log('🔧 API_URL:', API_URL);
  
  // Función para obtener parámetros de la URL
  function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const autoLogin = params.get('autoLogin') === 'true';
    
    console.log('🔍 Parámetros de URL:', { token: token ? '***' + token.slice(-10) : null, autoLogin });
    
    return { token, autoLogin };
  }

  // Función para verificar y autenticar con el token
  async function autoLoginWithToken(token) {
    try {
      console.log('🔐 Intentando auto-login con token...');
      console.log('🔐 Token (últimos 10 caracteres):', token.slice(-10));
      
      // Verificar el token con el backend
      const response = await fetch(`${API_URL}/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🔐 Respuesta del servidor:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error en respuesta:', errorText);
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🔐 Datos recibidos:', data);
      
      if (data.user) {
        // Guardar el token en localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        console.log('✅ Token y usuario guardados en localStorage');
        console.log('✅ Usuario autenticado:', data.user);
        
        // Esperar un momento para asegurar que script.js esté listo
        setTimeout(() => {
          // Disparar evento personalizado para que la app web sepa que el usuario está autenticado
          console.log('📢 Disparando evento userAuthenticated...');
          const event = new CustomEvent('userAuthenticated', {
            detail: { user: data.user, token: token }
          });
          window.dispatchEvent(event);
          console.log('✅ Evento userAuthenticated disparado');
          
          // También intentar llamar directamente a funciones si existen
          if (typeof window.checkAuth === 'function') {
            console.log('🔄 Llamando a checkAuth()...');
            window.checkAuth();
          }
          
          // Limpiar los parámetros de la URL para seguridad
          if (window.history && window.history.replaceState) {
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            console.log('🧹 URL limpiada');
          }
          
          // NO recargar automáticamente - dejar que script.js maneje el evento
          // Si después de 1 segundo no se actualizó, entonces recargar
          setTimeout(() => {
            const userInfo = document.getElementById('userInfo');
            if (!userInfo || userInfo.style.display === 'none') {
              console.log('⚠️ UI no se actualizó, recargando página...');
              window.location.reload();
            } else {
              console.log('✅ UI actualizada correctamente');
            }
          }, 1000);
        }, 100);
        
        return { success: true, user: data.user };
      } else {
        throw new Error('No se recibió información del usuario');
      }
    } catch (error) {
      console.error('❌ Error en auto-login:', error);
      return { success: false, error: error.message };
    }
  }

  // Función para verificar si ya hay una sesión activa
  function checkExistingSession() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    console.log('🔍 Verificando sesión existente...', { 
      tieneToken: !!token, 
      tieneUser: !!user 
    });
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        console.log('👤 Sesión existente encontrada:', userData);
        
        // Esperar un momento antes de disparar el evento
        setTimeout(() => {
          // Disparar evento para notificar que ya hay sesión
          console.log('📢 Disparando evento userAuthenticated para sesión existente...');
          window.dispatchEvent(new CustomEvent('userAuthenticated', {
            detail: { user: userData, token: token }
          }));
          console.log('✅ Evento disparado para sesión existente');
        }, 100);
        
        return true;
      } catch (error) {
        console.error('❌ Error al parsear usuario:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return false;
      }
    }
    
    return false;
  }

  // Función principal que se ejecuta al cargar
  function init() {
    console.log('🚀 Inicializando auto-login...');
    console.log('🚀 ReadyState:', document.readyState);
    console.log('🚀 URL completa:', window.location.href);
    
    // Primero verificar si ya hay una sesión activa
    const hasSession = checkExistingSession();
    
    if (hasSession) {
      console.log('✅ Sesión existente encontrada, no se requiere auto-login');
      return;
    }
    
    // Si no hay sesión, verificar si hay token en la URL
    const { token, autoLogin } = getUrlParams();
    
    if (token && autoLogin) {
      console.log('🔑 Token encontrado en URL, iniciando auto-login...');
      console.log('🔑 Token length:', token.length);
      
      autoLoginWithToken(token).then(result => {
        if (result.success) {
          console.log('✅ Usuario autenticado exitosamente');
        } else {
          console.warn('⚠️ No se pudo autenticar automáticamente:', result.error);
        }
      }).catch(error => {
        console.error('❌ Error en proceso de auto-login:', error);
      });
    } else {
      console.log('ℹ️ No se encontró token en la URL');
      console.log('ℹ️ Token:', token ? 'presente' : 'ausente');
      console.log('ℹ️ autoLogin:', autoLogin);
    }
  }

  // Esperar a que todo esté completamente cargado
  function waitForReady() {
    if (document.readyState === 'complete') {
      console.log('✅ Documento completamente cargado, iniciando auto-login...');
      // Esperar un poco más para asegurar que script.js esté listo
      setTimeout(init, 200);
    } else if (document.readyState === 'interactive' || document.readyState === 'loading') {
      console.log('⏳ Esperando a que el documento esté listo...');
      window.addEventListener('load', () => {
        console.log('✅ Window load event, iniciando auto-login...');
        setTimeout(init, 200);
      });
      document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ DOMContentLoaded, iniciando auto-login...');
        setTimeout(init, 200);
      });
    }
  }

  // Iniciar
  waitForReady();

  // Exportar funciones para uso externo si es necesario
  window.PremioClickAutoLogin = {
    autoLoginWithToken: autoLoginWithToken,
    checkExistingSession: checkExistingSession,
    getUrlParams: getUrlParams,
    init: init
  };

  console.log('✅ Script de auto-login inicializado');

})();
