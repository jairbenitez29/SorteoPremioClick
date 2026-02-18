import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider } from '../context/AuthContext';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// ErrorBoundary más robusto
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: string | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    // Manejar diferentes tipos de errores
    let errorMessage = 'Error desconocido';
    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.toString) {
      errorMessage = error.toString();
    }
    
    return { 
      hasError: true, 
      error: error instanceof Error ? error : new Error(errorMessage),
      errorInfo: errorMessage
    };
  }

  componentDidCatch(error: any, errorInfo: React.ErrorInfo) {
    console.error('Error capturado por ErrorBoundary:', error);
    console.error('Error Info:', errorInfo);
    const errorDetails = error?.message || 
                        errorInfo?.componentStack || 
                        error?.toString() ||
                        'Error desconocido';
    this.setState({ errorInfo: errorDetails });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>¡Oops! Algo salió mal</Text>
          <Text style={styles.errorMessage}>
            {this.state.errorInfo || this.state.error?.message || 'Error desconocido'}
          </Text>
          <Text style={styles.errorHint}>
            Por favor, cierra y vuelve a abrir la aplicación
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function RootLayout() {
  try {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <PaperProvider>
            <AuthProvider>
              <StatusBar style="auto" />
              <Stack
                screenOptions={({ route }: any) => ({
                  headerStyle: {
                    backgroundColor: '#7b2cbf',
                  },
                  headerTintColor: '#fff',
                  headerTitleStyle: {
                    fontWeight: 'bold',
                  },
                  headerTitle: route.name === '(tabs)' ? '' : undefined,
                })}
              >
                <Stack.Screen name="index" options={{ title: 'PremioClick' }} />
                <Stack.Screen name="(auth)/login" options={{ title: 'Iniciar Sesión' }} />
                <Stack.Screen name="(auth)/register" options={{ title: 'Registrarse' }} />
                <Stack.Screen name="(admin)" options={{ headerShown: false }} />
                <Stack.Screen name="sorteo/[id]" options={{ title: 'Detalle del Sorteo' }} />
                <Stack.Screen name="comprar-ticket/[id]" options={{ title: 'Comprar Ticket' }} />
                <Stack.Screen name="resultados/[id]" options={{ title: 'Resultados' }} />
                <Stack.Screen name="admin/crear-sorteo" options={{ title: 'Crear Sorteo' }} />
                <Stack.Screen name="admin/editar-sorteo/[id]" options={{ title: 'Editar Sorteo' }} />
              </Stack>
            </AuthProvider>
          </PaperProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  } catch (error: any) {
    console.error('Error en RootLayout:', error);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Error al cargar la aplicación</Text>
        <Text style={styles.errorMessage}>
          {error?.message || 'Error desconocido'}
        </Text>
        <Text style={styles.errorHint}>
          Por favor, cierra y vuelve a abrir la aplicación
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
});
