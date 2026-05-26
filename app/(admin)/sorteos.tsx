import { useEffect, useState, useCallback, memo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert, Image } from 'react-native';
import { Card, Text, Button, ActivityIndicator, FAB, Chip, Icon } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../services/api';
import { format } from 'date-fns';
import { SafeLinearGradient } from '../../components/SafeLinearGradient';

const getEstadoReal = (sorteo: any): 'activo' | 'finalizado' => {
  return new Date(sorteo.fecha_sorteo) < new Date() ? 'finalizado' : (sorteo.estado === 'activo' ? 'activo' : 'finalizado');
};

const ITEM_HEIGHT = 300;

const SorteoAdminCard = memo(({ sorteo, onEdit, onDelete }: { sorteo: any; onEdit: () => void; onDelete: () => void }) => {
  const estadoReal = getEstadoReal(sorteo);
  return (
    <Card style={styles.card} mode="elevated">
      <SafeLinearGradient
        colors={estadoReal === 'activo' ? ['#ffffff', '#f3e8ff', '#e9d5ff'] : ['#ffffff', '#f5f5f5', '#e0e0e0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <Card.Content style={styles.cardContent}>
          {sorteo.imagen_portada ? (
            <Image
              source={{ uri: sorteo.imagen_portada, cache: 'force-cache' }}
              style={styles.cardPortada}
              resizeMode="cover"
            />
          ) : null}
          <View style={styles.cardHeader}>
            <Text variant="titleLarge" style={styles.cardTitle} numberOfLines={2}>
              {sorteo.titulo}
            </Text>
            <Chip
              style={[styles.statusChip, estadoReal === 'activo' && styles.statusChipActive]}
              textStyle={styles.statusChipText}
            >
              {estadoReal === 'activo' ? 'Activo' : 'Finalizado'}
            </Chip>
          </View>
          <Text variant="bodyMedium" style={styles.cardDescription} numberOfLines={2}>
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
        <Button mode="contained" buttonColor="#7b2cbf" textColor="#fff" onPress={onEdit} style={styles.actionButton}>
          Editar
        </Button>
        <Button mode="contained" buttonColor="#f44336" textColor="#fff" onPress={onDelete} style={styles.actionButton}>
          Eliminar
        </Button>
      </Card.Actions>
    </Card>
  );
});

export default function AdminSorteos() {
  const router = useRouter();
  const [sorteos, setSorteos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSorteos = useCallback(async () => {
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
  }, []);

  useEffect(() => { loadSorteos(); }, []);
  useFocusEffect(useCallback(() => { loadSorteos(); }, [loadSorteos]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSorteos();
  }, [loadSorteos]);

  const handleDelete = useCallback((id: number, titulo: string) => {
    Alert.alert(
      'Eliminar Sorteo',
      `¿Estás seguro de eliminar "${titulo}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/sorteos/${id}`);
              loadSorteos();
            } catch {
              Alert.alert('Error', 'No se pudo eliminar el sorteo');
            }
          },
        },
      ]
    );
  }, [loadSorteos]);

  const renderItem = useCallback(({ item }: { item: any }) => (
    <SorteoAdminCard
      sorteo={item}
      onEdit={() => router.push(`/admin/editar-sorteo/${item.id}`)}
      onDelete={() => handleDelete(item.id, item.titulo)}
    />
  ), [router, handleDelete]);

  const keyExtractor = useCallback((item: any) => String(item.id), []);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7b2cbf" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeLinearGradient colors={['#ffffff', '#f3e8ff', '#e9d5ff']} style={styles.header}>
        <Text variant="headlineMedium" style={styles.headerText}>Gestión de Sorteos</Text>
      </SafeLinearGradient>

      <FlatList
        data={sorteos}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        removeClippedSubviews={true}
        maxToRenderPerBatch={6}
        windowSize={10}
        initialNumToRender={4}
        updateCellsBatchingPeriod={80}
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.emptyText}>No hay sorteos</Text>
            </Card.Content>
          </Card>
        }
      />

      <FAB icon="plus" style={styles.fab} onPress={() => router.push('/admin/crear-sorteo')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 32 },
  headerText: { color: '#212121', fontWeight: 'bold' },
  listContent: { padding: 16, paddingBottom: 80 },
  card: { marginBottom: 16, elevation: 4, borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff' },
  cardGradient: { borderRadius: 16 },
  cardContent: { padding: 16 },
  cardPortada: { width: '100%', height: 160, borderRadius: 8, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontWeight: 'bold', flex: 1, color: '#212121', fontSize: 18, marginRight: 8 },
  statusChip: { backgroundColor: '#e0e0e0' },
  statusChipActive: { backgroundColor: '#7b2cbf' },
  statusChipText: { color: '#fff', fontWeight: '600' },
  cardDescription: { color: '#424242', marginBottom: 12, fontSize: 14 },
  cardInfoRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { color: '#212121', fontSize: 13, fontWeight: '500' },
  cardStats: { flexDirection: 'row', marginTop: 4 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(123,44,191,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statText: { color: '#7b2cbf', fontSize: 13, fontWeight: '600' },
  cardActions: { padding: 8, backgroundColor: '#fff', flexDirection: 'row' },
  actionButton: { marginHorizontal: 4 },
  emptyCard: { marginTop: 32 },
  emptyText: { textAlign: 'center', color: '#666' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#7b2cbf' },
});
