import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Image, Alert } from 'react-native';
import { Card, Text, Button, ActivityIndicator, FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { format } from 'date-fns';
import { SafeLinearGradient } from '../../components/SafeLinearGradient';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [sorteos, setSorteos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSorteos();
  }, []);

  const loadSorteos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sorteos');
      setSorteos(response.data);
    } catch (error: any) {
      console.error('Error al cargar sorteos:', error);
      console.error('Detalles del error:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        config: error.config?.url
      });
      
      let errorMessage = 'No se pudieron cargar los sorteos.';
      let errorTitle = 'Error de Conexión';
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'El servidor está tardando demasiado en responder.\n\nVerifica:\n• Que el backend esté corriendo\n• Que la IP configurada sea correcta (192.168.1.59)\n• Que ambos dispositivos estén en la misma red WiFi';
      } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error') || error.message?.includes('ERR_NETWORK')) {
        errorMessage = 'No se pudo conectar al servidor.\n\nVerifica:\n• Que el backend esté corriendo en el puerto 3001\n• Que la IP configurada sea correcta\n• Que el firewall no esté bloqueando la conexión\n• Que ambos dispositivos estén en la misma red WiFi';
      } else if (error.response) {
        errorMessage = `Error del servidor: ${error.response.status}\n${error.response.data?.error || error.response.data?.message || ''}`;
      }
      
      Alert.alert(errorTitle, errorMessage, [{ text: 'OK' }]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSorteos();
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
        <Text variant="headlineMedium" style={styles.welcomeText}>
          ¡Hola, {user?.nombre || 'Usuario'}!
        </Text>
        <Text variant="bodyLarge" style={styles.subtitleText}>
          Participa en nuestros sorteos
        </Text>
      </SafeLinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {sorteos.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.emptyText}>
                No hay sorteos disponibles
              </Text>
            </Card.Content>
          </Card>
        ) : (
          sorteos.map((sorteo) => (
            <Card
              key={sorteo.id}
              style={styles.card}
              mode="elevated"
              onPress={() => router.push(`/sorteo/${sorteo.id}`)}
            >
              <SafeLinearGradient
                colors={sorteo.estado === 'activo' ? ['#ffffff', '#f3e8ff', '#e9d5ff'] : ['#ffffff', '#f5f5f5', '#e0e0e0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <Card.Content style={styles.cardContent}>
                  {sorteo.imagen_portada ? (
                    <Image 
                      source={{ uri: sorteo.imagen_portada }} 
                      style={styles.cardImage}
                      resizeMode="cover"
                    />
                  ) : null}
                  <Text variant="titleLarge" style={styles.cardTitle}>
                    {sorteo.titulo}
                  </Text>
                  <Text variant="bodyMedium" style={styles.cardDescription}>
                    {sorteo.descripcion || 'Sin descripción'}
                  </Text>
                  <View style={styles.cardInfo}>
                    <Text variant="bodySmall" style={styles.cardDate}>
                      📅 {format(new Date(sorteo.fecha_sorteo), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm")}
                    </Text>
                  </View>
                  <View style={styles.cardBadge}>
                    <Text
                      variant="labelSmall"
                      style={[
                        styles.badgeText,
                        sorteo.estado === 'activo' && styles.badgeActive,
                        sorteo.estado === 'finalizado' && styles.badgeFinished,
                      ]}
                    >
                      {sorteo.estado === 'activo' ? 'Activo' : 'Finalizado'}
                    </Text>
                  </View>
                </Card.Content>
              </SafeLinearGradient>
              <Card.Actions style={styles.cardActions}>
                {sorteo.estado === 'activo' && (
                  <Button
                    mode="contained"
                    buttonColor="#7b2cbf"
                    textColor="#fff"
                    onPress={(e) => {
                      e.stopPropagation();
                      if (!user) {
                        Alert.alert(
                          'Registro Requerido',
                          'Para participar en este sorteo necesitas estar registrado. ¿Deseas registrarte ahora?',
                          [
                            {
                              text: 'Cancelar',
                              style: 'cancel',
                            },
                            {
                              text: 'Registrarme',
                              onPress: () => router.push('/(auth)/register'),
                            },
                            {
                              text: 'Ya tengo cuenta',
                              onPress: () => router.push('/(auth)/login'),
                            },
                          ]
                        );
                      } else {
                        router.push(`/comprar-ticket/${sorteo.id}`);
                      }
                    }}
                    style={styles.buyButton}
                  >
                    Participar
                  </Button>
                )}
                <Button
                  mode={sorteo.estado === 'activo' ? 'outlined' : 'contained'}
                  buttonColor={sorteo.estado === 'activo' ? undefined : '#7b2cbf'}
                  textColor={sorteo.estado === 'activo' ? '#7b2cbf' : '#fff'}
                  onPress={() => router.push(`/sorteo/${sorteo.id}`)}
                >
                  Ver Detalles
                </Button>
              </Card.Actions>
            </Card>
          ))
        )}
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
  welcomeText: {
    color: '#212121',
    fontWeight: 'bold',
    marginBottom: 8,
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
    elevation: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  cardGradient: {
    borderRadius: 16,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#212121',
    fontSize: 18,
  },
  cardDescription: {
    color: '#424242',
    marginBottom: 12,
    fontSize: 14,
  },
  cardInfo: {
    marginBottom: 8,
  },
  cardDate: {
    color: '#212121',
    fontWeight: '500',
    fontSize: 12,
  },
  buyButton: {
    marginRight: 8,
  },
  cardBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  badgeText: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    color: '#666',
  },
  badgeActive: {
    backgroundColor: '#7b2cbf',
    color: '#fff',
  },
  badgeFinished: {
    backgroundColor: '#757575',
    color: '#fff',
  },
  cardActions: {
    padding: 8,
    backgroundColor: '#fff',
  },
  emptyCard: {
    marginTop: 32,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
  cardImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
    resizeMode: 'cover',
  },
});

