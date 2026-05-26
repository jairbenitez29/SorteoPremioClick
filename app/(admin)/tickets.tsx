import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { Card, Text, Button, ActivityIndicator, TextInput, Chip, Divider, IconButton, Modal, Portal, FAB } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../services/api';
import { SafeLinearGradient } from '../../components/SafeLinearGradient';

interface Ticket {
  id: number;
  numero_ticket: string;
  precio: string;
  estado: string;
  sorteo_id: number;
  sorteo_titulo: string;
}

interface GrupoSorteo {
  sorteoId: number;
  sorteoNombre: string;
  tickets: Ticket[];
  total: number;
  disponibles: number;
}

const TicketRow = memo(({ ticket, onDelete }: { ticket: Ticket; onDelete: () => void }) => (
  <Card style={styles.ticketCard}>
    <Card.Content style={styles.ticketContent}>
      <View style={styles.ticketInfo}>
        <View style={styles.ticketLeft}>
          <Text variant="bodyMedium" style={styles.ticketNumber}>{ticket.numero_ticket}</Text>
          <Text variant="bodySmall" style={styles.ticketPrice}>${parseFloat(ticket.precio).toFixed(0)}</Text>
        </View>
        <View style={styles.ticketRight}>
          <Chip
            style={[styles.ticketChip, ticket.estado === 'disponible' ? styles.ticketChipAvailable : styles.ticketChipSold]}
            textStyle={styles.ticketChipText}
          >
            {ticket.estado === 'disponible' ? 'Disponible' : 'Vendido'}
          </Chip>
          {ticket.estado === 'disponible' && (
            <IconButton icon="delete" iconColor="#f44336" size={20} onPress={onDelete} style={styles.deleteButton} />
          )}
        </View>
      </View>
    </Card.Content>
  </Card>
));

const GrupoCard = memo(({ grupo, searchQuery, onSearchChange, onDeleteTicket, onDeleteSorteoTickets }: {
  grupo: GrupoSorteo;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onDeleteTicket: (id: number) => void;
  onDeleteSorteoTickets: () => void;
}) => {
  const ticketsToShow = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (query) return grupo.tickets.filter(t => t.numero_ticket.toLowerCase().includes(query));
    return grupo.tickets.slice(0, 1);
  }, [searchQuery, grupo.tickets]);

  return (
    <Card style={styles.sorteoCard}>
      <Card.Content style={styles.sorteoCardContent}>
        <View style={styles.sorteoCardHeader}>
          <Text variant="titleMedium" style={styles.sorteoCardTitle} numberOfLines={1}>{grupo.sorteoNombre}</Text>
          {grupo.disponibles > 0 && (
            <IconButton icon="delete-outline" iconColor="#f44336" size={22} onPress={onDeleteSorteoTickets} style={styles.deleteSorteoButton} />
          )}
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text variant="headlineSmall" style={styles.statNumber}>{grupo.total}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="headlineSmall" style={[styles.statNumber, styles.statAvailable]}>{grupo.disponibles}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Disponibles</Text>
          </View>
        </View>
        <Divider style={styles.divider} />
        <TextInput
          mode="outlined"
          label="Buscar ticket por número"
          value={searchQuery}
          onChangeText={onSearchChange}
          style={styles.searchInput}
          textColor="#000"
          placeholder="Ej: Gran Rifa-00"
        />
        {ticketsToShow.length === 0 ? (
          <Text variant="bodyMedium" style={styles.noResults}>No se encontraron tickets con ese número</Text>
        ) : (
          ticketsToShow.map(ticket => (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              onDelete={() => onDeleteTicket(ticket.id)}
            />
          ))
        )}
      </Card.Content>
    </Card>
  );
});

export default function AdminTickets() {
  const router = useRouter();
  const [sorteos, setSorteos] = useState<any[]>([]);
  const [selectedSorteo, setSelectedSorteo] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState('100');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQueries, setSearchQueries] = useState<{ [key: number]: string }>({});

  const loadSorteos = useCallback(async () => {
    try {
      const response = await api.get('/sorteos');
      setSorteos(response.data);
      if (response.data.length > 0 && !selectedSorteo) {
        setSelectedSorteo(response.data[0].id);
      }
    } catch {
      if (__DEV__) console.warn('No se pudieron cargar los sorteos');
      setSorteos([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSorteo]);

  const loadTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const response = await api.get('/admin/tickets');
      setTickets(response.data);
    } catch {
      if (__DEV__) console.warn('No se pudieron cargar los tickets');
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  useEffect(() => { loadSorteos(); loadTickets(); }, []);
  useFocusEffect(useCallback(() => { loadSorteos(); }, [loadSorteos]));
  useEffect(() => { if (modalVisible) loadSorteos(); }, [modalVisible]);

  // GroupBy memoizado — solo recalcula cuando cambian los tickets
  const gruposSorteo = useMemo<GrupoSorteo[]>(() => {
    const map: { [key: number]: Ticket[] } = {};
    tickets.forEach(ticket => {
      if (!map[ticket.sorteo_id]) map[ticket.sorteo_id] = [];
      map[ticket.sorteo_id].push(ticket);
    });
    return Object.keys(map).map(id => {
      const id_num = parseInt(id);
      const list = map[id_num];
      return {
        sorteoId: id_num,
        sorteoNombre: list[0].sorteo_titulo,
        tickets: list,
        total: list.length,
        disponibles: list.filter(t => t.estado === 'disponible').length,
      };
    });
  }, [tickets]);

  const handleDeleteTicket = useCallback((ticketId: number) => {
    Alert.alert('Eliminar Ticket', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/tickets/${ticketId}`);
            Alert.alert('Éxito', 'Ticket eliminado');
            loadTickets();
          } catch {
            Alert.alert('Error', 'No se pudo eliminar el ticket.');
          }
        },
      },
    ]);
  }, [loadTickets]);

  const handleDeleteSorteoTickets = useCallback((sorteoId: number, nombre: string, disponibles: number) => {
    if (disponibles === 0) { Alert.alert('Info', 'No hay tickets disponibles'); return; }
    Alert.alert('Eliminar Tickets', `¿Eliminar ${disponibles} tickets disponibles de "${nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await api.delete(`/tickets/sorteo/${sorteoId}`);
            Alert.alert('Éxito', `${response.data.eliminados || disponibles} tickets eliminados`);
            loadTickets();
          } catch {
            Alert.alert('Error', 'No se pudieron eliminar.');
          }
        },
      },
    ]);
  }, [loadTickets]);

  const handleGenerarTickets = useCallback(async () => {
    if (!selectedSorteo) { Alert.alert('Error', 'Selecciona un sorteo'); return; }
    if (!cantidad || parseInt(cantidad, 10) < 1) { Alert.alert('Error', 'Indica una cantidad válida'); return; }
    const sorteo = sorteos.find((s: any) => s.id === selectedSorteo);
    const precio = sorteo?.precio_ticket != null && parseFloat(String(sorteo.precio_ticket)) > 0
      ? parseFloat(String(sorteo.precio_ticket))
      : null;
    if (!precio) {
      Alert.alert('Precio no definido', 'Configura el precio en Editar Sorteo.');
      return;
    }
    setGenerating(true);
    try {
      await api.post(`/tickets/generar/${selectedSorteo}`, { cantidad: parseInt(cantidad, 10), precio });
      Alert.alert('Éxito', `${cantidad} tickets generados`);
      setCantidad('100');
      setModalVisible(false);
      loadTickets();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'No se pudieron generar los tickets.';
      Alert.alert('No se puede generar', msg);
    } finally {
      setGenerating(false);
    }
  }, [selectedSorteo, cantidad, sorteos, loadTickets]);

  const selectedSorteoTieneVendidos = useMemo(() => {
    if (!selectedSorteo) return false;
    const grupo = gruposSorteo.find(g => g.sorteoId === selectedSorteo);
    if (!grupo) return false;
    return grupo.tickets.some(t => t.estado === 'vendido');
  }, [selectedSorteo, gruposSorteo]);

  const handleSearchChange = useCallback((sorteoId: number, text: string) => {
    setSearchQueries(prev => ({ ...prev, [sorteoId]: text }));
  }, []);

  const renderGrupo = useCallback(({ item }: { item: GrupoSorteo }) => (
    <GrupoCard
      grupo={item}
      searchQuery={searchQueries[item.sorteoId] || ''}
      onSearchChange={(text) => handleSearchChange(item.sorteoId, text)}
      onDeleteTicket={handleDeleteTicket}
      onDeleteSorteoTickets={() => handleDeleteSorteoTickets(item.sorteoId, item.sorteoNombre, item.disponibles)}
    />
  ), [searchQueries, handleSearchChange, handleDeleteTicket, handleDeleteSorteoTickets]);

  const keyExtractor = useCallback((item: GrupoSorteo) => String(item.sorteoId), []);

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
        <Text variant="headlineMedium" style={styles.headerText}>Tickets</Text>
      </SafeLinearGradient>

      {loadingTickets ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color="#7b2cbf" />
        </View>
      ) : (
        <FlatList
          data={gruposSorteo}
          renderItem={renderGrupo}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          removeClippedSubviews={true}
          maxToRenderPerBatch={4}
          windowSize={8}
          initialNumToRender={3}
          updateCellsBatchingPeriod={100}
          ListHeaderComponent={
            <View style={styles.ticketsHeader}>
              <Text variant="titleLarge" style={styles.cardTitle}>Tickets Generados</Text>
              <Button mode="text" onPress={loadTickets} icon="refresh" textColor="#7b2cbf">Actualizar</Button>
            </View>
          }
          ListEmptyComponent={
            <Text variant="bodyMedium" style={styles.noTickets}>No hay tickets generados</Text>
          }
        />
      )}

      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modalContainer}>
          <Card style={styles.modalCard}>
            <Card.Content>
              <View style={styles.modalHeader}>
                <Text variant="titleLarge" style={styles.modalTitle}>Generar Tickets</Text>
                <IconButton icon="close" size={24} onPress={() => setModalVisible(false)} />
              </View>
              <Text variant="bodyMedium" style={styles.label}>Seleccionar Sorteo</Text>
              <View style={styles.sorteosList}>
                {sorteos.map((sorteo) => (
                  <Chip key={sorteo.id} selected={selectedSorteo === sorteo.id} onPress={() => setSelectedSorteo(sorteo.id)} style={styles.sorteoChip}>
                    {sorteo.titulo}
                  </Chip>
                ))}
              </View>
              {selectedSorteoTieneVendidos && (
                <View style={styles.warningBox}>
                  <Text variant="bodySmall" style={styles.warningText}>
                    ⚠️ Este sorteo tiene tickets vendidos. No se pueden generar tickets nuevos para mantener la integridad del sorteo. Los tickets disponibles existentes siguen en venta.
                  </Text>
                </View>
              )}
              <TextInput label="Cantidad de Tickets" value={cantidad} onChangeText={setCantidad} mode="outlined" keyboardType="numeric" style={styles.input} textColor="#000" disabled={selectedSorteoTieneVendidos} />
              <Text variant="bodySmall" style={{ color: '#666', marginBottom: 12 }}>
                El precio por ticket se toma del sorteo (configurable en Editar Sorteo).
              </Text>
              <Button mode="contained" buttonColor="#7b2cbf" textColor="#fff" onPress={handleGenerarTickets} loading={generating} disabled={generating || selectedSorteoTieneVendidos} style={styles.button} contentStyle={styles.buttonContent}>
                Generar Tickets
              </Button>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      <FAB icon="plus" style={styles.fab} onPress={() => setModalVisible(true)} color="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 100 },
  header: { padding: 24, paddingTop: 60, paddingBottom: 32 },
  headerText: { color: '#212121', fontWeight: 'bold' },
  listContent: { padding: 16, paddingTop: 8, paddingBottom: 80 },
  ticketsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontWeight: 'bold' },
  label: { marginBottom: 8, color: '#666' },
  sorteosList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  sorteoChip: { marginBottom: 8 },
  input: { marginBottom: 16, backgroundColor: '#fff' },
  warningBox: { backgroundColor: '#fff3e0', borderRadius: 8, padding: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#ff9800' },
  warningText: { color: '#e65100', lineHeight: 18 },
  searchInput: { marginBottom: 12, backgroundColor: '#fff' },
  noResults: { textAlign: 'center', color: '#666', padding: 16, fontStyle: 'italic' },
  button: { marginTop: 8 },
  buttonContent: { paddingVertical: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10, paddingVertical: 8, backgroundColor: '#f3e8ff', borderRadius: 10 },
  statItem: { alignItems: 'center' },
  statNumber: { color: '#7b2cbf', fontWeight: 'bold', fontSize: 18 },
  statAvailable: { color: '#4caf50' },
  statLabel: { color: '#666', marginTop: 2, fontSize: 11 },
  ticketCard: { marginBottom: 6, elevation: 1 },
  ticketContent: { paddingVertical: 8, paddingHorizontal: 12 },
  ticketInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketLeft: { flex: 1 },
  ticketRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ticketNumber: { fontWeight: '600', color: '#212121', marginBottom: 2, fontSize: 14 },
  ticketPrice: { color: '#7b2cbf', fontWeight: '500', fontSize: 12 },
  ticketChip: { height: 32, minWidth: 100 },
  ticketChipAvailable: { backgroundColor: '#4caf50' },
  ticketChipSold: { backgroundColor: '#ff9800' },
  ticketChipText: { fontSize: 13, color: '#fff', fontWeight: 'bold' },
  deleteButton: { margin: 0 },
  noTickets: { textAlign: 'center', color: '#666', padding: 20 },
  sorteoCard: { marginBottom: 12, elevation: 3, borderRadius: 12 },
  sorteoCardContent: { padding: 12 },
  sorteoCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sorteoCardTitle: { fontWeight: 'bold', color: '#7b2cbf', fontSize: 16, flex: 1 },
  deleteSorteoButton: { margin: 0 },
  divider: { marginVertical: 10, backgroundColor: '#e0e0e0' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#7b2cbf' },
  modalContainer: { padding: 20 },
  modalCard: { borderRadius: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontWeight: 'bold', color: '#212121' },
});
