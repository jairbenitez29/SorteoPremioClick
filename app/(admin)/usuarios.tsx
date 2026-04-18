import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Card, Text, ActivityIndicator, Chip, Menu, IconButton } from 'react-native-paper';
import { api } from '../../services/api';
import { SafeLinearGradient } from '../../components/SafeLinearGradient';
import { format } from 'date-fns';

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    try {
      const response = await api.get('/admin/usuarios');
      setUsuarios(response.data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUsuarios();
  };

  const handleChangeRole = async (userId: number, newRole: 'usuario' | 'admin') => {
    try {
      await api.put(`/admin/usuarios/${userId}/rol`, { rol: newRole });
      Alert.alert('Éxito', 'Rol actualizado correctamente');
      loadUsuarios();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el rol');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7b2cbf" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeLinearGradient
        colors={['#ffffff', '#f3e8ff', '#e9d5ff']}
        style={styles.header}
      >
        <Text variant="headlineMedium" style={styles.headerText}>
          Gestión de Usuarios
        </Text>
        <Text variant="bodyMedium" style={styles.subtitleText}>
          Total: {usuarios.length} usuarios
        </Text>
      </SafeLinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {usuarios.map((usuario) => (
          <Card key={usuario.id} style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                  <Text variant="titleMedium" style={styles.userName}>
                    {usuario.nombre}
                  </Text>
                  <Text variant="bodySmall" style={styles.userEmail}>
                    {usuario.email}
                  </Text>
                  {usuario.telefono && (
                    <Text variant="bodySmall" style={styles.userPhone}>
                      {usuario.telefono}
                    </Text>
                  )}
                </View>
                <Chip
                  style={[
                    styles.roleChip,
                    usuario.rol === 'admin' && styles.roleChipAdmin,
                  ]}
                  textStyle={styles.roleChipText}
                >
                  {usuario.rol === 'admin' ? 'Admin' : 'Usuario'}
                </Chip>
              </View>
              <Text variant="bodySmall" style={styles.userDate}>
                Registrado: {format(new Date(usuario.created_at), "dd 'de' MMMM 'de' yyyy")}
              </Text>
            </Card.Content>
            <Card.Actions>
              <Menu
                key={`menu-${usuario.id}-${menuVisible[usuario.id] ? 'open' : 'closed'}`}
                visible={menuVisible[usuario.id] || false}
                onDismiss={() => setMenuVisible((prev) => ({ ...prev, [usuario.id]: false }))}
                anchor={
                  <IconButton
                    icon="dots-vertical"
                    onPress={() => setMenuVisible((prev) => ({ ...prev, [usuario.id]: true }))}
                  />
                }
              >
                <Menu.Item
                  onPress={() => {
                    handleChangeRole(usuario.id, 'admin');
                    setMenuVisible((prev) => ({ ...prev, [usuario.id]: false }));
                  }}
                  title="Hacer Admin"
                  disabled={usuario.rol === 'admin'}
                />
                <Menu.Item
                  onPress={() => {
                    handleChangeRole(usuario.id, 'usuario');
                    setMenuVisible((prev) => ({ ...prev, [usuario.id]: false }));
                  }}
                  title="Quitar Admin"
                  disabled={usuario.rol === 'usuario'}
                />
              </Menu>
            </Card.Actions>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#212121',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    color: '#666',
    marginBottom: 2,
  },
  userPhone: {
    color: '#666',
  },
  userDate: {
    color: '#999',
    marginTop: 8,
  },
  roleChip: {
    backgroundColor: '#e0e0e0',
  },
  roleChipAdmin: {
    backgroundColor: '#ff9800',
  },
  roleChipText: {
    color: '#fff',
  },
});

