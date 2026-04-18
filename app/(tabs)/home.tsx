import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Image, Alert } from 'react-native';
import { Card, Text, Button, ActivityIndicator, FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { format } from 'date-fns';
import { SafeLinearGradient } from '../../components/SafeLinearGradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'cache_sorteos';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function getCached(allowExpired = true): Promise<any[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (!allowExpired && Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

async function setCache(data: any[]) {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

// Función helper para verificar si un sorteo está vencido
const isSorteoVencido = (fechaSorteo: string | Date): boolean => {
  const fecha = new Date(fechaSorteo);
  const ahora = new Date();
  return fecha < ahora;
};

// Función helper para obtener el estado real del sorteo
const getEstadoReal = (sorteo: any): 'activo' | 'finalizado' => {
  // Si la fecha ya pasó, el sorteo está finalizado
  if (isSorteoVencido(sorteo.fecha_sorteo)) {
    return 'finalizado';
  }
  // Si no, usa el estado del backend
  return sorteo.estado === 'activo' ? 'activo' : 'finalizado';
};

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [sorteos, setSorteos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSorteos();
  }, []);

  const loadSorteos = async (forceRefresh = false) => {
    // Mostrar caché inmediatamente si existe
    if (!forceRefresh) {
      const cached = await getCached(true);
      if (cached) {
        setSorteos(cached);
        setLoading(false);
        // Actualizar en segundo plano sin mostrar spinner
        api.get('/sorteos').then(r => {
          setSorteos(r.data);
          setCache(r.data);
        }).catch(() => {});
        return;
      }
    }
    // Sin caché: mostrar spinner y esperar
    try {
      setLoading(true);
      const response = await api.get('/sorteos');
      setSorteos(response.data);
      setCache(response.data);
    } catch {
      if (__DEV__) console.warn('No se pudieron cargar los sorteos');
      // Mantener datos visibles si ya había cache/UI cargada
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSorteos(true).finally(() => setRefreshing(false));
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
          sorteos.map((sorteo) => {
            const estadoReal = getEstadoReal(sorteo);
            return (
            <Card
              key={sorteo.id}
              style={styles.card}
              mode="elevated"
              onPress={() => router.push(`/sorteo/${sorteo.id}`)}
            >
              <SafeLinearGradient
                colors={estadoReal === 'activo' ? ['#ffffff', '#f3e8ff', '#e9d5ff'] : ['#ffffff', '#f5f5f5', '#e0e0e0']}
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
                      {format(new Date(sorteo.fecha_sorteo), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm")}
                    </Text>
                  </View>
                  <View style={styles.cardBadge}>
                    <Text
                      variant="labelSmall"
                      style={[
                        styles.badgeText,
                        estadoReal === 'activo' && styles.badgeActive,
                        estadoReal === 'finalizado' && styles.badgeFinished,
                      ]}
                    >
                      {estadoReal === 'activo' ? 'Activo' : 'Finalizado'}
                    </Text>
                  </View>
                </Card.Content>
              </SafeLinearGradient>
              <Card.Actions style={styles.cardActions}>
                {estadoReal === 'activo' && (
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
                  mode={estadoReal === 'activo' ? 'outlined' : 'contained'}
                  buttonColor={estadoReal === 'activo' ? undefined : '#7b2cbf'}
                  textColor={estadoReal === 'activo' ? '#7b2cbf' : '#fff'}
                  onPress={() => router.push(`/sorteo/${sorteo.id}`)}
                >
                  Ver Detalles
                </Button>
              </Card.Actions>
            </Card>
            );
          })
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

