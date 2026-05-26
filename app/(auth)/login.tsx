import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { TextInput, Button, Text, IconButton, Checkbox } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { SafeLinearGradient } from '../../components/SafeLinearGradient';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, getSavedCredentials } = useAuth();
  const router = useRouter();
  const { errorVisible, errorTitle, errorMessage, errorType, showError, hideError } = useErrorHandler();

  // Cargar credenciales guardadas al montar
  useEffect(() => {
    (async () => {
      const saved = await getSavedCredentials();
      if (saved) {
        setEmail(saved.email);
        setPassword(saved.password);
        setRememberMe(true);
      }
    })();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      showError('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const userData = await login(email, password, rememberMe);
      if (userData && userData.rol === 'admin') {
        router.replace('/(admin)/dashboard');
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (err: any) {
      let errorMsg = err.message || 'Error al iniciar sesión';
      const technicalPatterns = [
        'AxiosError', 'Request failed', 'status code', 'ECONN', 'ERR_',
        'Network Error', 'timeout', 'ECONNABORTED', 'ECONNREFUSED',
        'ENOTFOUND', 'EAI_AGAIN', 'getaddrinfo', 'socket', 'XMLHttpRequest',
        'fetch', 'axios', 'http', 'https', '://', 'localhost', '127.0.0.1'
      ];
      const hasTechnicalContent = technicalPatterns.some(p =>
        errorMsg.toLowerCase().includes(p.toLowerCase())
      );
      if (hasTechnicalContent) {
        if (errorMsg.includes('401') || errorMsg.includes('403'))
          errorMsg = 'Email o contraseña incorrectos. Por favor, verifica tus credenciales.';
        else if (errorMsg.includes('400'))
          errorMsg = 'Los datos enviados no son válidos. Por favor, verifica la información.';
        else
          errorMsg = 'Error al iniciar sesión. Por favor, verifica tus credenciales e intenta de nuevo.';
      }
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
                size={22}
                iconColor="#7b2cbf"
                onPress={() => router.replace('/(tabs)/home')}
                style={styles.guestButton}
                containerColor="#ede9fe"
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
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={styles.input}
              textColor="#000"
              outlineColor="#7b2cbf"
              activeOutlineColor="#7b2cbf"
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />

            <View style={styles.rememberRow}>
              <Checkbox
                status={rememberMe ? 'checked' : 'unchecked'}
                onPress={() => setRememberMe(!rememberMe)}
                color="#7b2cbf"
              />
              <Text
                style={styles.rememberText}
                onPress={() => setRememberMe(!rememberMe)}
              >
                Recordar mis datos
              </Text>
            </View>

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
  container: { flex: 1 },
  gradient: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    padding: 20,
    paddingTop: 10,
  },
  content: { padding: 20, paddingTop: 0 },
  logoContainer: { alignItems: 'center', marginBottom: 8 },
  logo: { width: 280, height: 280 },
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
  input: { marginBottom: 14, backgroundColor: '#fff' },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: -4,
  },
  rememberText: {
    color: '#555',
    fontSize: 14,
    marginLeft: 4,
  },
  button: { marginTop: 4, marginBottom: 12 },
  buttonContent: { paddingVertical: 8 },
  linkButton: { marginTop: 4, marginBottom: 8 },
  guestContainer: {
    marginTop: 0,
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  guestButton: {
    margin: 0,
    borderRadius: 50,
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
