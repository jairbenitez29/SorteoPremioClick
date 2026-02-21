import { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { TextInput, Button, Text, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { SafeLinearGradient } from '../../components/SafeLinearGradient';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { errorVisible, errorTitle, errorMessage, errorType, showError, hideError } = useErrorHandler();

  const handleLogin = async () => {
    if (!email || !password) {
      showError('Por favor completa todos los campos');
      return;
    }

    setLoading(true);

    try {
      const userData = await login(email, password);
      console.log('Usuario logueado:', userData); // Debug
      // Redirigir según el rol del usuario
      if (userData && userData.rol === 'admin') {
        console.log('Redirigiendo a panel de admin');
        router.replace('/(admin)/dashboard');
      } else {
        console.log('Redirigiendo a panel de usuario');
        router.replace('/(tabs)/home');
      }
    } catch (err: any) {
      // El error ya viene formateado desde AuthContext (sin información técnica)
      // Asegurarse de que nunca se muestre información técnica
      let errorMsg = err.message || 'Error al iniciar sesión';
      
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
        if (errorMsg.includes('401') || errorMsg.includes('403')) {
          errorMsg = 'Email o contraseña incorrectos. Por favor, verifica tus credenciales.';
        } else if (errorMsg.includes('400')) {
          errorMsg = 'Los datos enviados no son válidos. Por favor, verifica la información.';
        } else {
          errorMsg = 'Error al iniciar sesión. Por favor, verifica tus credenciales e intenta de nuevo.';
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
        colors={['#ffffff', '#f3e8ff', '#e9d5ff', '#d8b4fe']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.guestContainer}>
              <IconButton
                icon="home"
                size={40}
                iconColor="#fff"
                onPress={() => router.replace('/(tabs)/home')}
                style={styles.guestButton}
                containerColor="#7b2cbf"
              />
            </View>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/logo.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text variant="displaySmall" style={styles.title}>
              PremioClick
            </Text>
            <Text variant="titleMedium" style={styles.subtitle}>
              Inicia sesión para continuar
            </Text>

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              textColor="#000"
              outlineColor="#7b2cbf"
              activeOutlineColor="#7b2cbf"
            />

            <TextInput
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
              textColor="#000"
              outlineColor="#7b2cbf"
              activeOutlineColor="#7b2cbf"
            />

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
              buttonColor="#7b2cbf"
              textColor="#fff"
            >
              Iniciar Sesión
            </Button>

            <Button
              mode="text"
              onPress={() => router.push('/(auth)/register')}
              style={styles.linkButton}
              textColor="#7b2cbf"
            >
              ¿No tienes cuenta? Regístrate
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
    justifyContent: 'flex-start',
    padding: 20,
    paddingTop: 10,
  },
  content: {
    padding: 20,
    paddingTop: 0,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 280,
    height: 280,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
    color: '#7b2cbf',
    fontSize: 36,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    fontSize: 16,
  },
  input: {
    marginBottom: 14,
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 4,
    marginBottom: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  linkButton: {
    marginTop: 4,
    marginBottom: 8,
  },
  guestContainer: {
    marginTop: 0,
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  guestButton: {
    margin: 0,
    borderRadius: 50,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

