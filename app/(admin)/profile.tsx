import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Text, Button, TextInput, Modal, Portal } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { SafeLinearGradient } from '../../components/SafeLinearGradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';

export default function AdminProfile() {
  const { user, logout, updateUser } = useAuth();
  const router = useRouter();
  const { errorVisible, errorTitle, errorMessage, errorType, showError, hideError } = useErrorHandler();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showNombreModal, setShowNombreModal] = useState(false);
  
  // Estados para editar email
  const [nuevoEmail, setNuevoEmail] = useState(user?.email || '');
  const [loadingEmail, setLoadingEmail] = useState(false);
  
  // Estados para cambiar contraseña
  const [passwordActual, setPasswordActual] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [showPasswordActual, setShowPasswordActual] = useState(false);
  const [showNuevaPassword, setShowNuevaPassword] = useState(false);
  const [showConfirmarPassword, setShowConfirmarPassword] = useState(false);
  
  // Estados para editar nombre
  const [nuevoNombre, setNuevoNombre] = useState(user?.nombre || '');
  const [loadingNombre, setLoadingNombre] = useState(false);

  useEffect(() => {
    if (user) {
      setNuevoEmail(user.email || '');
      setNuevoNombre(user.nombre || '');
    }
  }, [user]);

  const handleUpdateEmail = async () => {
    if (!nuevoEmail) {
      Alert.alert('Error', 'El email es obligatorio');
      return;
    }

    setLoadingEmail(true);
    try {
      const response = await api.put('/auth/profile', {
        nombre: user?.nombre,
        email: nuevoEmail,
        telefono: null,
      });
      Alert.alert('Éxito', 'Email actualizado correctamente');
      if (response.data.user) {
        updateUser(response.data.user);
      }
      setShowEmailModal(false);
    } catch (error: any) {
      showError(error);
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleUpdateNombre = async () => {
    if (!nuevoNombre) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }

    setLoadingNombre(true);
    try {
      const response = await api.put('/auth/profile', {
        nombre: nuevoNombre,
        email: user?.email,
        telefono: null,
      });
      Alert.alert('Éxito', 'Nombre actualizado correctamente');
      if (response.data.user) {
        updateUser(response.data.user);
      }
      setShowNombreModal(false);
    } catch (error: any) {
      showError(error);
    } finally {
      setLoadingNombre(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordActual || !nuevaPassword || !confirmarPassword) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }

    if (nuevaPassword.length < 6) {
      Alert.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoadingPassword(true);
    try {
      await api.put('/auth/change-password', {
        password_actual: passwordActual,
        nueva_password: nuevaPassword,
      });
      Alert.alert('Éxito', 'Contraseña actualizada correctamente');
      setPasswordActual('');
      setNuevaPassword('');
      setConfirmarPassword('');
      setShowPasswordModal(false);
      setShowPasswordActual(false);
      setShowNuevaPassword(false);
      setShowConfirmarPassword(false);
    } catch (error: any) {
      showError(error);
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const getWebUrl = async () => {
    // Obtener la URL base del API y construir la URL de la página web
    const apiBaseUrl = (api && api.defaults && api.defaults.baseURL) || 'https://sorteo-5lh6.vercel.app/api';
    // Remover /api del final si existe
    let webUrl = apiBaseUrl.replace(/\/api$/, '');
    
    // Si no tiene protocolo, agregar https://
    if (!webUrl.startsWith('http://') && !webUrl.startsWith('https://')) {
      webUrl = `https://${webUrl}`;
    }
    
    // Si termina con :3001, remover el puerto para producción
    if (webUrl.includes(':3001')) {
      webUrl = webUrl.replace(':3001', '');
    }
    
    // En producción, usar siempre la URL de premioclick.cl
    if (!__DEV__ || apiBaseUrl.includes('premioclick.cl')) {
      webUrl = 'https://premioclick.cl';
    }
    
    // Obtener el token de autenticación
    try {
      const token = await AsyncStorage.getItem('token');
      if (token && user) {
        // Pasar el token como parámetro en la URL para que la web pueda autenticar automáticamente
        const separator = webUrl.includes('?') ? '&' : '?';
        webUrl = `${webUrl}${separator}token=${encodeURIComponent(token)}&autoLogin=true`;
        console.log('🔐 Token incluido en URL para autenticación automática');
      }
    } catch (error) {
      console.error('❌ Error al obtener token:', error);
    }
    
    console.log('🌐 URL de la página web:', webUrl.replace(/token=[^&]+/, 'token=***'));
    return webUrl;
  };

  const handleOpenWebPage = async () => {
    try {
      if (!user) {
        Alert.alert(
          'Sesión Requerida',
          'Debes estar logueado para acceder a las premiaciones en línea. ¿Deseas iniciar sesión?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Iniciar Sesión',
              onPress: () => router.push('/(auth)/login'),
            },
          ]
        );
        return;
      }

      const webUrl = await getWebUrl();
      console.log('🔗 Abriendo página web con autenticación automática');
      await WebBrowser.openBrowserAsync(webUrl);
    } catch (error: any) {
      console.error('❌ Error al abrir página web:', error);
      showError(error);
    }
  };

  return (
    <View style={styles.container}>
      <SafeLinearGradient
        colors={['#ffffff', '#f3e8ff', '#e9d5ff']}
        style={styles.header}
      >
        <Text variant="headlineMedium" style={styles.headerText}>
          Mi Perfil
        </Text>
        <Text variant="bodyMedium" style={styles.subtitleText}>
          Administrador
        </Text>
      </SafeLinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.profileSection}>
              <View style={styles.avatar}>
                <Text variant="headlineMedium" style={styles.avatarText}>
                  {user?.nombre?.charAt(0).toUpperCase() || 'A'}
                </Text>
              </View>
              <Text variant="titleLarge" style={styles.name}>
                {user?.nombre || 'Administrador'}
              </Text>
              <Text variant="bodyMedium" style={styles.email}>
                {user?.email || ''}
              </Text>
              <View style={styles.adminBadge}>
                <Text variant="labelSmall" style={styles.adminBadgeText}>
                  👑 Administrador
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card 
          style={styles.actionCard}
          onPress={() => setShowNombreModal(true)}
        >
          <Card.Content style={styles.actionCardContent}>
            <MaterialCommunityIcons name="account-edit" size={24} color="#7b2cbf" />
            <View style={styles.actionCardText}>
              <Text variant="titleMedium" style={styles.actionCardTitle}>
                Editar Nombre
              </Text>
              <Text variant="bodySmall" style={styles.actionCardSubtitle}>
                {user?.nombre || 'Sin nombre'}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
          </Card.Content>
        </Card>

        <Card 
          style={styles.actionCard}
          onPress={() => setShowEmailModal(true)}
        >
          <Card.Content style={styles.actionCardContent}>
            <MaterialCommunityIcons name="email-edit" size={24} color="#7b2cbf" />
            <View style={styles.actionCardText}>
              <Text variant="titleMedium" style={styles.actionCardTitle}>
                Cambiar Email
              </Text>
              <Text variant="bodySmall" style={styles.actionCardSubtitle}>
                {user?.email || 'Sin email'}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
          </Card.Content>
        </Card>

        <Card 
          style={styles.actionCard}
          onPress={() => setShowPasswordModal(true)}
        >
          <Card.Content style={styles.actionCardContent}>
            <MaterialCommunityIcons name="lock-reset" size={24} color="#7b2cbf" />
            <View style={styles.actionCardText}>
              <Text variant="titleMedium" style={styles.actionCardTitle}>
                Cambiar Contraseña
              </Text>
              <Text variant="bodySmall" style={styles.actionCardSubtitle}>
                Actualizar tu contraseña de acceso
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
          </Card.Content>
        </Card>

        <Card 
          style={styles.actionCard}
          onPress={handleOpenWebPage}
        >
          <Card.Content style={styles.actionCardContent}>
            <MaterialCommunityIcons name="web" size={24} color="#7b2cbf" />
            <View style={styles.actionCardText}>
              <Text variant="titleMedium" style={styles.actionCardTitle}>
                Premiaciones en Línea
              </Text>
              <Text variant="bodySmall" style={styles.actionCardSubtitle}>
                Las premiaciones se realizan en nuestra página web
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleLogout}
          style={styles.logoutButton}
          buttonColor="#d32f2f"
          contentStyle={styles.logoutButtonContent}
        >
          Cerrar Sesión
        </Button>
      </ScrollView>

      <ErrorDisplay
        visible={errorVisible}
        title={errorTitle}
        message={errorMessage}
        type={errorType}
        onDismiss={hideError}
      />

      {/* Modal para editar nombre */}
      <Portal>
        <Modal
          visible={showNombreModal}
          onDismiss={() => setShowNombreModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text variant="titleLarge" style={styles.modalTitle}>
              Editar Nombre
            </Text>
            <TextInput
              label="Nombre *"
              value={nuevoNombre}
              onChangeText={setNuevoNombre}
              mode="outlined"
              style={styles.modalInput}
              textColor="#000"
            />
            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => setShowNombreModal(false)}
                style={styles.modalButton}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={handleUpdateNombre}
                loading={loadingNombre}
                disabled={loadingNombre}
                style={styles.modalButton}
              >
                Guardar
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>

      {/* Modal para editar email */}
      <Portal>
        <Modal
          visible={showEmailModal}
          onDismiss={() => setShowEmailModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text variant="titleLarge" style={styles.modalTitle}>
              Cambiar Email
            </Text>
            <TextInput
              label="Nuevo Email *"
              value={nuevoEmail}
              onChangeText={setNuevoEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.modalInput}
              textColor="#000"
            />
            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => setShowEmailModal(false)}
                style={styles.modalButton}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={handleUpdateEmail}
                loading={loadingEmail}
                disabled={loadingEmail}
                style={styles.modalButton}
              >
                Guardar
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>

      {/* Modal para cambiar contraseña */}
      <Portal>
        <Modal
          visible={showPasswordModal}
          onDismiss={() => setShowPasswordModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text variant="titleLarge" style={styles.modalTitle}>
              Cambiar Contraseña
            </Text>
            <TextInput
              label="Contraseña Actual *"
              value={passwordActual}
              onChangeText={setPasswordActual}
              mode="outlined"
              secureTextEntry={!showPasswordActual}
              style={styles.modalInput}
              textColor="#000"
              right={
                <TextInput.Icon
                  icon={showPasswordActual ? 'eye-off' : 'eye'}
                  onPress={() => setShowPasswordActual(!showPasswordActual)}
                />
              }
            />
            <TextInput
              label="Nueva Contraseña *"
              value={nuevaPassword}
              onChangeText={setNuevaPassword}
              mode="outlined"
              secureTextEntry={!showNuevaPassword}
              style={styles.modalInput}
              textColor="#000"
              right={
                <TextInput.Icon
                  icon={showNuevaPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowNuevaPassword(!showNuevaPassword)}
                />
              }
            />
            <TextInput
              label="Confirmar Nueva Contraseña *"
              value={confirmarPassword}
              onChangeText={setConfirmarPassword}
              mode="outlined"
              secureTextEntry={!showConfirmarPassword}
              style={styles.modalInput}
              textColor="#000"
              right={
                <TextInput.Icon
                  icon={showConfirmarPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowConfirmarPassword(!showConfirmarPassword)}
                />
              }
            />
            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => {
                  setShowPasswordModal(false);
                  setPasswordActual('');
                  setNuevaPassword('');
                  setConfirmarPassword('');
                  setShowPasswordActual(false);
                  setShowNuevaPassword(false);
                  setShowConfirmarPassword(false);
                }}
                style={styles.modalButton}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={handleChangePassword}
                loading={loadingPassword}
                disabled={loadingPassword}
                style={styles.modalButton}
              >
                Cambiar
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  headerText: {
    color: '#212121',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitleText: {
    color: '#424242',
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 4,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#7b2cbf',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  name: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    color: '#666',
    marginBottom: 8,
  },
  adminBadge: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  adminBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  actionCard: {
    marginBottom: 12,
    elevation: 2,
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionCardText: {
    flex: 1,
    marginLeft: 16,
  },
  actionCardTitle: {
    fontWeight: '500',
    marginBottom: 4,
  },
  actionCardSubtitle: {
    color: '#666',
  },
  logoutButton: {
    marginTop: 16,
    marginBottom: 32,
  },
  logoutButtonContent: {
    paddingVertical: 8,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  modalContent: {
    width: '100%',
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalInput: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 12,
  },
  modalButton: {
    minWidth: 100,
  },
});
