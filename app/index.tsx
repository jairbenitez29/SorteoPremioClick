import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

// Despierta Vercel en silencio para evitar cold starts cuando el usuario use la app
function wakeUpServer() {
  fetch('https://sorteo-premio-click.vercel.app/api/health').catch(() => {
    setTimeout(() => {
      fetch('https://sorteo-premio-click.vercel.app/api/health').catch(() => {});
    }, 2000);
  });
}

export default function Index() {
  const { user, loading, checkAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    wakeUpServer();
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      try {
        if (user) {
          // Si es admin, redirigir al panel de admin
          console.log('🔍 Usuario en index.tsx:', user);
          console.log('🔍 Rol del usuario:', user.rol);
          console.log('🔍 Tipo de rol:', typeof user.rol);
          console.log('🔍 Comparación admin:', user.rol === 'admin');
          
          if (user.rol === 'admin') {
            console.log('✅ Redirigiendo a panel de admin');
            router.replace('/(admin)/dashboard');
          } else {
            console.log('✅ Redirigiendo a panel de usuario normal');
            router.replace('/(tabs)/home');
          }
        } else {
          // Si no hay usuario, permitir ver premios como invitado
          // No redirigir automáticamente al login
          router.replace('/(tabs)/home');
        }
      } catch (error) {
        console.error('Error en redirección:', error);
        // Si hay error, redirigir a home de todas formas
        router.replace('/(tabs)/home');
      }
    }
  }, [user, loading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#7b2cbf" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

