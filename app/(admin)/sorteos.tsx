import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Image } from 'react-native';
import { Card, Text, Button, ActivityIndicator, FAB, IconButton, Chip, Icon } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../services/api';
import { format } from 'date-fns';
import { SafeLinearGradient } from '../../components/SafeLinearGradient';
import { useCallback } from 'react';

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

export default function AdminSorteos() {
  const router = useRouter();
  const [sorteos, setSorteos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSorteos();
  }, []);

  // Recargar sorteos cuando la pantalla recibe foco (al volver de crear/editar)
  useFocusEffect(
    useCallback(() => {
      loadSorteos();
    }, [])
  );

  const loadSorteos = async () => {
    try {
      const response = await api.get('/sorteos');
      setSorteos(response.data);
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

  const handleDelete = async (id: number, titulo: string) => {
    Alert.alert(
      'Eliminar Sorteo',
      `¿Estás seguro de eliminar el sorteo "${titulo}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/sorteos/${id}`);
              loadSorteos();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el sorteo');
            }
          },
        },
      ]
    );
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
          Gestión de Sorteos
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
                No hay sorteos
              </Text>
            </Card.Content>
          </Card>
        ) : (
          sorteos.map((sorteo) => {
            const estadoReal = getEstadoReal(sorteo);
            return (
            <Card key={sorteo.id} style={styles.card} mode="elevated">
              <SafeLinearGradient
                colors={estadoReal === 'activo' ? ['#ffffff', '#f3e8ff', '#e9d5ff'] : ['#ffffff', '#f5f5f5', '#e0e0e0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <Card.Content style={styles.cardContent}>
                  {sorteo.imagen_portada ? (
                    <Image source={{ uri: sorteo.imagen_portada }} style={styles.cardPortada} resizeMode="cover" />
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
                      {estadoReal === 'activo' ? 'Activo' : 'Finalizado'}
                    </Chip>
                  </View>
                  <Text variant="bodyMedium" style={styles.cardDescription}>
                    {sorteo.descripcion || 'Sin descripción'}
                  </Text>
                  <View style={styles.cardInfoRow}>
                    <View style={styles.infoItem}>
                      <Icon source="calendar" size={16} color="#7b2cbf" />
                      <Text style={styles.infoText}>
                        {format(new Date(sorteo.fecha_sorteo), "dd MMM yyyy")}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Icon source="clock-outline" size={16} color="#7b2cbf" />
                      <Text style={styles.infoText}>
                        {format(new Date(sorteo.fecha_sorteo), "HH:mm")}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardStats}>
                    <View style={styles.statItem}>
                      <Icon source="gift-outline" size={16} color="#7b2cbf" />
                      <Text style={styles.statText}>{sorteo.total_productos || 0} premios</Text>
                    </View>
                  </View>
                </Card.Content>
              </SafeLinearGradient>
              <Card.Actions style={styles.cardActions}>
                <Button
                  mode="contained"
                  buttonColor="#7b2cbf"
                  textColor="#fff"
                  onPress={() => router.push(`/admin/editar-sorteo/${sorteo.id}`)}
                  style={styles.actionButton}
                >
                  Editar
                </Button>
                <Button
                  mode="contained"
                  buttonColor="#f44336"
                  textColor="#fff"
                  onPress={() => handleDelete(sorteo.id, sorteo.titulo)}
                  style={styles.actionButton}
                >
                  Eliminar
                </Button>
              </Card.Actions>
            </Card>
            );
          })
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/admin/crear-sorteo')}
      />
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
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
  cardPortada: {
    width: '100%',
    height: 160,
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 12,
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#7b2cbf',
  },
});

