import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Image } from 'react-native';
import { Card, Text, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { format } from 'date-fns';
import { SafeLinearGradient } from '../../components/SafeLinearGradient';

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

export default function SorteosScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [sorteos, setSorteos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'todos' | 'activos' | 'finalizados'>('activos');

  useEffect(() => {
    loadSorteos();
  }, [filter]);

  const loadSorteos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sorteos');
      let data = response.data;
      if (filter === 'activos') {
        data = data.filter((s: any) => getEstadoReal(s) === 'activo');
      } else if (filter === 'finalizados') {
        data = data.filter((s: any) => getEstadoReal(s) === 'finalizado');
      }
      setSorteos(data);
    } catch {
      if (__DEV__) console.warn('No se pudieron cargar los sorteos');
      setSorteos([]);
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
      <View style={styles.filterContainer}>
        <Chip
          selected={filter === 'todos'}
          onPress={() => setFilter('todos')}
          style={styles.chip}
        >
          Todos
        </Chip>
        <Chip
          selected={filter === 'activos'}
          onPress={() => setFilter('activos')}
          style={styles.chip}
        >
          Activos
        </Chip>
        <Chip
          selected={filter === 'finalizados'}
          onPress={() => setFilter('finalizados')}
          style={styles.chip}
        >
          Finalizados
        </Chip>
      </View>

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
                  <View style={styles.cardHeader}>
                    <Text variant="titleLarge" style={styles.cardTitle}>
                      {sorteo.titulo}
                    </Text>
                    <Chip
                      style={[
                        styles.statusChip,
                        estadoReal === 'activo' && styles.statusChipActive,
                      ]}
                      textStyle={styles.statusChipText}
                    >
                      {estadoReal === 'activo' ? '✨ Activo' : '✅ Finalizado'}
                    </Chip>
                  </View>
                  <Text variant="bodyMedium" style={styles.cardDescription}>
                    {sorteo.descripcion || 'Sin descripción'}
                  </Text>
                  <View style={styles.cardInfoRow}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoIcon}>📅</Text>
                      <Text style={styles.infoText}>
                        {format(new Date(sorteo.fecha_sorteo), "dd MMM yyyy")}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoIcon}>🕐</Text>
                      <Text style={styles.infoText}>
                        {format(new Date(sorteo.fecha_sorteo), "HH:mm")}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statIcon}>🎁</Text>
                      <Text style={styles.statText}>{sorteo.total_productos || 0} premios</Text>
                    </View>
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
                    style={styles.actionButton}
                  >
                    Participar
                  </Button>
                )}
                <Button
                  mode={estadoReal === 'activo' ? 'outlined' : 'contained'}
                  buttonColor={estadoReal === 'activo' ? undefined : '#7b2cbf'}
                  textColor={estadoReal === 'activo' ? '#7b2cbf' : '#fff'}
                  onPress={() => router.push(`/sorteo/${sorteo.id}`)}
                  style={styles.actionButton}
                >
                  Ver Detalles
                </Button>
                {estadoReal === 'finalizado' && (
                  <Button
                    mode="contained"
                    buttonColor="#212121"
                    textColor="#fff"
                    onPress={() => router.push(`/resultados/${sorteo.id}`)}
                    style={styles.actionButton}
                  >
                    Resultados
                  </Button>
                )}
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
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  chip: {
    marginRight: 8,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    fontWeight: 'bold',
    flex: 1,
    color: '#212121',
    fontSize: 20,
  },
  statusChip: {
    backgroundColor: '#e0e0e0',
  },
  statusChipActive: {
    backgroundColor: '#7b2cbf',
  },
  statusChipText: {
    color: '#fff',
    fontWeight: '600',
  },
  cardDescription: {
    color: '#424242',
    marginBottom: 12,
    fontSize: 14,
  },
  cardInfoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    color: '#212121',
    fontSize: 13,
    fontWeight: '500',
  },
  cardStats: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(3, 169, 244, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(3, 169, 244, 0.2)',
  },
  statIcon: {
    fontSize: 16,
  },
  statText: {
    color: '#212121',
    fontSize: 13,
    fontWeight: '600',
  },
  cardActions: {
    padding: 8,
    backgroundColor: '#fff',
  },
  actionButton: {
    marginHorizontal: 4,
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

