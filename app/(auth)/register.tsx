import { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { SafeLinearGradient } from '../../components/SafeLinearGradient';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';

export default function RegisterScreen() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();
  const { errorVisible, errorTitle, errorMessage, errorType, showError, hideError } = useErrorHandler();

  const handleRegister = async () => {
    if (!nombre || !email || !password) {
      showError('Por favor completa los campos obligatorios');
      return;
    }

    if (password.length < 6) {
      showError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      // Solo pasar telefono si tiene valor
      const telefonoValue = telefono.trim() !== '' ? telefono.trim() : undefined;
      const userData = await register(nombre.trim(), email.trim(), password, telefonoValue);
      // Redirigir según el rol del usuario (normalmente será 'usuario' al registrarse)
      if (userData?.rol === 'admin') {
        router.replace('/(admin)/dashboard');
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (err: any) {
      // Log técnico solo en consola (no se muestra al usuario)
      console.error('Error en handleRegister:', err);
      
      // El error ya viene formateado desde AuthContext (sin información técnica)
      // Asegurarse de que nunca se muestre información técnica
      let errorMsg = err.message || 'Error al registrarse';
      
      // Filtrar CUALQUIER mensaje técnico que pueda haber escapado
      const technicalPatterns = [
        'AxiosError', 'Request failed', 'status code', 'ECONN', 'ERR_', 
        'Network Error', 'timeout', 'ECONNABORTED', 'ECONNREFUSED',
        'ENOTFOUND', 'EAI_AGAIN', 'getaddrinfo', 'socket', 'XMLHttpRequest',
        'fetch', 'axios', 'http', 'https', '://', 'localhost', '127.0.0.1'
      ];
      
      const hasTechnicalContent = technicalPatterns.some(pattern => 
        errorMsg.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (hasTechnicalContent) {
        // Si tiene contenido técnico, usar mensaje genérico según el contexto
        if (errorMsg.includes('409') || errorMsg.includes('email') && errorMsg.includes('registrado')) {
          errorMsg = 'El email ya está registrado. Por favor, usa otro email o inicia sesión.';
        } else if (errorMsg.includes('400')) {
          errorMsg = 'Los datos enviados no son válidos. Por favor, verifica la información.';
        } else {
          errorMsg = 'Error al registrarse. Por favor, verifica la información e intenta de nuevo.';
        }
      }
      
      // Pasar como string para que useErrorHandler lo filtre también
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <SafeLinearGradient
        colors={['#ffffff', '#f3e8ff', '#e9d5ff']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text variant="displaySmall" style={styles.title}>
              Crear Cuenta
            </Text>
            <Text variant="titleMedium" style={styles.subtitle}>
              Regístrate para participar en sorteos
            </Text>

            <TextInput
              label="Nombre completo *"
              value={nombre}
              onChangeText={setNombre}
              mode="outlined"
              style={styles.input}
              textColor="#000"
            />

            <TextInput
              label="Email *"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              textColor="#000"
            />

            <TextInput
              label="Teléfono"
              value={telefono}
              onChangeText={setTelefono}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
              textColor="#000"
            />

            <TextInput
              label="Contraseña *"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
              textColor="#000"
            />

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Registrarse
            </Button>

            <Button
              mode="text"
              onPress={() => router.back()}
              style={styles.linkButton}
            >
              ¿Ya tienes cuenta? Inicia sesión
            </Button>
          </View>
        </ScrollView>

        <ErrorDisplay
          visible={errorVisible}
          title={errorTitle}
          message={errorMessage}
          type={errorType}
          onDismiss={hideError}
        />
      </SafeLinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
    color: '#7b2cbf',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  linkButton: {
    marginTop: 8,
  },
});

