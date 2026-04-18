import { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { SafeLinearGradient } from '../../components/SafeLinearGradient';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { validatePassword, getPasswordStrengthLabel } from '../../utils/passwordValidator';

export default function RegisterScreen() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useAuth();
  const router = useRouter();
  const { errorVisible, errorTitle, errorMessage, errorType, showError, hideError } = useErrorHandler();

  const passwordCheck = validatePassword(password);
  const strengthInfo = getPasswordStrengthLabel(password);

  const handleRegister = async () => {
    if (!nombre || !email || !password) {
      showError('Por favor completa los campos obligatorios');
      return;
    }

    if (!passwordCheck.valid) {
      showError('La contraseña no cumple los requisitos:\n' + passwordCheck.errors.join('\n'));
      return;
    }

    setLoading(true);
    try {
      const telefonoValue = telefono.trim() !== '' ? telefono.trim() : undefined;
      const userData = await register(nombre.trim(), email.trim(), password, telefonoValue);
      if (userData?.rol === 'admin') {
        router.replace('/(admin)/dashboard');
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (err: any) {
      console.error('Error en handleRegister:', err);
      let errorMsg = err.message || 'Error al registrarse';
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
        if (errorMsg.includes('409') || (errorMsg.includes('email') && errorMsg.includes('registrado')))
          errorMsg = 'El email ya está registrado. Por favor, usa otro email o inicia sesión.';
        else if (errorMsg.includes('400'))
          errorMsg = 'Los datos enviados no son válidos. Por favor, verifica la información.';
        else
          errorMsg = 'Error al registrarse. Por favor, verifica la información e intenta de nuevo.';
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
              label="Nombre completo"
              value={nombre}
              onChangeText={setNombre}
              mode="outlined"
              style={styles.input}
              textColor="#000"
              outlineColor="#7b2cbf"
              activeOutlineColor="#7b2cbf"
            />

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
              label="Teléfono (opcional)"
              value={telefono}
              onChangeText={setTelefono}
              mode="outlined"
              keyboardType="phone-pad"
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

            {password.length > 0 && (
              <View style={styles.passwordFeedback}>
                <View style={styles.strengthBar}>
                  {[1, 2, 3, 4, 5].map(i => {
                    const filled = (5 - passwordCheck.errors.length) >= i;
                    return (
                      <View
                        key={i}
                        style={[
                          styles.strengthSegment,
                          { backgroundColor: filled ? strengthInfo.color : '#e0e0e0' }
                        ]}
                      />
                    );
                  })}
                </View>
                {strengthInfo.label ? (
                  <Text style={[styles.strengthLabel, { color: strengthInfo.color }]}>
                    {strengthInfo.label}
                  </Text>
                ) : null}
                {passwordCheck.errors.map((e, i) => (
                  <Text key={i} style={styles.requirementText}>• {e}</Text>
                ))}
              </View>
            )}

            {password.length === 0 && (
              <View style={styles.passwordHints}>
                <Text style={styles.hintsTitle}>La contraseña debe tener:</Text>
                <Text style={styles.hintText}>• Mínimo 8 caracteres</Text>
                <Text style={styles.hintText}>• Al menos una mayúscula (A-Z)</Text>
                <Text style={styles.hintText}>• Al menos una minúscula (a-z)</Text>
                <Text style={styles.hintText}>• Al menos un número (0-9)</Text>
                <Text style={styles.hintText}>• Al menos un carácter especial (. ! @ # $ %)</Text>
              </View>
            )}

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={loading}
              disabled={loading || !passwordCheck.valid}
              style={styles.button}
              contentStyle={styles.buttonContent}
              buttonColor="#7b2cbf"
              textColor="#fff"
            >
              Registrarse
            </Button>

            <Button
              mode="text"
              onPress={() => router.back()}
              style={styles.linkButton}
              textColor="#7b2cbf"
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
  container: { flex: 1 },
  gradient: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
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
  input: { marginBottom: 16, backgroundColor: '#fff' },
  passwordFeedback: { marginTop: -8, marginBottom: 16 },
  strengthBar: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 12,
    color: '#f44336',
    lineHeight: 18,
  },
  passwordHints: {
    marginTop: -8,
    marginBottom: 16,
    backgroundColor: '#f3e8ff',
    borderRadius: 8,
    padding: 10,
  },
  hintsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7b2cbf',
    marginBottom: 4,
  },
  hintText: {
    fontSize: 12,
    color: '#555',
    lineHeight: 20,
  },
  button: { marginTop: 8, marginBottom: 16 },
  buttonContent: { paddingVertical: 8 },
  linkButton: { marginTop: 8 },
});
