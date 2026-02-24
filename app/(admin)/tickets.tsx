import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Card, Text, Button, ActivityIndicator, TextInput, Chip, Divider, IconButton, Modal, Portal } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../services/api';
import { SafeLinearGradient } from '../../components/SafeLinearGradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FAB } from 'react-native-paper';
import { useCallback } from 'react';

export default function AdminTickets() {
  const router = useRouter();
  const [sorteos, setSorteos] = useState<any[]>([]);
  const [selectedSorteo, setSelectedSorteo] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState('100');
  const [precio, setPrecio] = useState('1000');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    loadSorteos();
  }, []);

  useEffect(() => {
    loadTickets();
  }, []);

  // Recargar sorteos cuando la pantalla recibe foco (al volver de crear sorteo)
  useFocusEffect(
    useCallback(() => {
      loadSorteos();
    }, [])
  );

  // Recargar sorteos cuando se abre el modal
  useEffect(() => {
    if (modalVisible) {
      loadSorteos();
    }
  }, [modalVisible]);

  // Recargar sorteos cuando la pantalla recibe foco (al volver de crear sorteo)
  useFocusEffect(
    useCallback(() => {
      loadSorteos();
    }, [])
  );

  // Recargar sorteos cuando se abre el modal
  useEffect(() => {
    if (modalVisible) {
      loadSorteos();
    }
  }, [modalVisible]);

  const loadSorteos = async () => {
    try {
      const response = await api.get('/sorteos');
      setSorteos(response.data);
      if (response.data.length > 0 && !selectedSorteo) {
        setSelectedSorteo(response.data[0].id);
      }
    } catch (error) {
      console.error('Error al cargar sorteos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      // Obtener todos los tickets de todos los sorteos
      const response = await api.get('/admin/tickets');
      setTickets(response.data);
    } catch (error) {
      console.error('Error al cargar tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleDeleteTicket = async (ticketId: number) => {
    Alert.alert(
      'Eliminar Ticket',
      '¿Estás seguro de que deseas eliminar este ticket?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/tickets/${ticketId}`);
              Alert.alert('Éxito', 'Ticket eliminado correctamente');
              loadTickets();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'No se pudo eliminar el ticket');
            }
          },
        },
      ]
    );
  };

  const handleDeleteSorteoTickets = async (sorteoId: number, sorteoNombre: string, disponibles: number) => {
    if (disponibles === 0) {
      Alert.alert('Info', 'No hay tickets disponibles para eliminar en este sorteo');
      return;
    }

    Alert.alert(
      'Eliminar Tickets Disponibles',
      `¿Estás seguro de que deseas eliminar todos los ${disponibles} tickets disponibles del sorteo "${sorteoNombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/tickets/sorteo/${sorteoId}`);
              Alert.alert('Éxito', `${response.data.eliminados || disponibles} tickets eliminados correctamente`);
              loadTickets();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'No se pudieron eliminar los tickets');
            }
          },
        },
      ]
    );
  };

  const handleGenerarTickets = async () => {
    if (!selectedSorteo) {
      Alert.alert('Error', 'Selecciona un sorteo');
      return;
    }

    if (!cantidad || !precio) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }

    setGenerating(true);
    try {
      await api.post(`/tickets/generar/${selectedSorteo}`, {
        cantidad: parseInt(cantidad),
        precio: parseFloat(precio),
      });
      Alert.alert('Éxito', `${cantidad} tickets generados correctamente`);
      setCantidad('100');
      setPrecio('1000');
      setModalVisible(false);
      // Recargar tickets después de generarlos
      loadTickets();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'No se pudieron generar los tickets');
    } finally {
      setGenerating(false);
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
          Tickets
        </Text>
      </SafeLinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.ticketsHeader}>
          <Text variant="titleLarge" style={styles.cardTitle}>
            Tickets Generados
          </Text>
          <View style={styles.headerActions}>
            <Button
              mode="text"
              onPress={loadTickets}
              icon="refresh"
              textColor="#7b2cbf"
              style={styles.headerButton}
            >
              Actualizar
            </Button>
          </View>
        </View>

        {loadingTickets ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color="#7b2cbf" />
          </View>
        ) : (
          <>
            {(() => {
              // Agrupar tickets por sorteo
              const ticketsPorSorteo: { [key: number]: any[] } = {};
              tickets.forEach((ticket: any) => {
                const sorteoId = ticket.sorteo_id;
                if (!ticketsPorSorteo[sorteoId]) {
                  ticketsPorSorteo[sorteoId] = [];
                }
                ticketsPorSorteo[sorteoId].push(ticket);
              });

              const sorteosConTickets = Object.keys(ticketsPorSorteo).map(id => ({
                sorteoId: parseInt(id),
                sorteoNombre: ticketsPorSorteo[parseInt(id)][0].sorteo_titulo,
                tickets: ticketsPorSorteo[parseInt(id)],
              }));

              if (sorteosConTickets.length === 0) {
                return (
                  <Text variant="bodyMedium" style={styles.noTickets}>
                    No hay tickets generados
                  </Text>
                );
              }

              return sorteosConTickets.map((grupo) => {
                const totalTickets = grupo.tickets.length;
                const disponibles = grupo.tickets.filter((t: any) => t.estado === 'disponible').length;

                return (
                  <Card key={grupo.sorteoId} style={styles.sorteoCard}>
                    <Card.Content style={styles.sorteoCardContent}>
                      <View style={styles.sorteoCardHeader}>
                        <Text variant="titleMedium" style={styles.sorteoCardTitle}>
                          {grupo.sorteoNombre}
                        </Text>
                        {disponibles > 0 && (
                          <IconButton
                            icon="delete-outline"
                            iconColor="#f44336"
                            size={22}
                            onPress={() => handleDeleteSorteoTickets(grupo.sorteoId, grupo.sorteoNombre, disponibles)}
                            style={styles.deleteSorteoButton}
                          />
                        )}
                      </View>
                      
                      <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                          <Text variant="headlineSmall" style={styles.statNumber}>
                            {totalTickets}
                          </Text>
                          <Text variant="bodySmall" style={styles.statLabel}>
                            Total
                          </Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text variant="headlineSmall" style={[styles.statNumber, styles.statAvailable]}>
                            {disponibles}
                          </Text>
                          <Text variant="bodySmall" style={styles.statLabel}>
                            Disponibles
                          </Text>
                        </View>
                      </View>

                      <Divider style={styles.divider} />

                      <TextInput
                        mode="outlined"
                        label="Buscar ticket por número"
                        value={searchQuery[grupo.sorteoId] || ''}
                        onChangeText={(text) => setSearchQuery({ ...searchQuery, [grupo.sorteoId]: text })}
                        style={styles.searchInput}
                        textColor="#000"
                        placeholder="Ej: Gran Rifa-00"
                      />

                      <View>
                        {(() => {
                          const query = (searchQuery[grupo.sorteoId] || '').toLowerCase().trim();
                          let ticketsToShow = grupo.tickets;
                          
                          if (query) {
                            ticketsToShow = grupo.tickets.filter((t: any) => 
                              t.numero_ticket.toLowerCase().includes(query)
                            );
                          } else {
                            // Si no hay búsqueda, mostrar solo el primero
                            ticketsToShow = grupo.tickets.slice(0, 1);
                          }

                          if (ticketsToShow.length === 0) {
                            return (
                              <Text variant="bodyMedium" style={styles.noResults}>
                                No se encontraron tickets con ese número
                              </Text>
                            );
                          }

                          return ticketsToShow.map((ticket: any) => (
                            <Card key={ticket.id} style={styles.ticketCard}>
                              <Card.Content style={styles.ticketContent}>
                                <View style={styles.ticketInfo}>
                                  <View style={styles.ticketLeft}>
                                    <Text variant="bodyMedium" style={styles.ticketNumber}>
                                      {ticket.numero_ticket}
                                    </Text>
                                    <Text variant="bodySmall" style={styles.ticketPrice}>
                                      ${parseFloat(ticket.precio).toFixed(0)}
                                    </Text>
                                  </View>
                                  <View style={styles.ticketRight}>
                                    <Chip
                                      style={[
                                        styles.ticketChip,
                                        ticket.estado === 'disponible' && styles.ticketChipAvailable,
                                        ticket.estado === 'vendido' && styles.ticketChipSold,
                                      ]}
                                      textStyle={[
                                        styles.ticketChipText,
                                        ticket.estado === 'disponible' && styles.ticketChipTextAvailable,
                                      ]}
                                    >
                                      {ticket.estado === 'disponible' ? 'Disponible' : 'Vendido'}
                                    </Chip>
                                    {ticket.estado === 'disponible' && (
                                      <IconButton
                                        icon="delete"
                                        iconColor="#f44336"
                                        size={20}
                                        onPress={() => handleDeleteTicket(ticket.id)}
                                        style={styles.deleteButton}
                                      />
                                    )}
                                  </View>
                                </View>
                              </Card.Content>
                            </Card>
                          ));
                        })()}
                      </View>
                    </Card.Content>
                  </Card>
                );
              });
            })()}
          </>
        )}

      </ScrollView>

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.modalCard}>
            <Card.Content>
              <View style={styles.modalHeader}>
                <Text variant="titleLarge" style={styles.modalTitle}>
                  Generar Tickets
                </Text>
                <IconButton
                  icon="close"
                  size={24}
                  onPress={() => setModalVisible(false)}
                />
              </View>

              <Text variant="bodyMedium" style={styles.label}>
                Seleccionar Sorteo
              </Text>
              <View style={styles.sorteosList}>
                {sorteos.map((sorteo) => (
                  <Chip
                    key={sorteo.id}
                    selected={selectedSorteo === sorteo.id}
                    onPress={() => setSelectedSorteo(sorteo.id)}
                    style={styles.sorteoChip}
                  >
                    {sorteo.titulo}
                  </Chip>
                ))}
              </View>

              <TextInput
                label="Cantidad de Tickets"
                value={cantidad}
                onChangeText={setCantidad}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
                textColor="#000"
              />

              <TextInput
                label="Precio por Ticket"
                value={precio}
                onChangeText={setPrecio}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
                textColor="#000"
              />

              <Button
                mode="contained"
                buttonColor="#7b2cbf"
                textColor="#fff"
                onPress={handleGenerarTickets}
                loading={generating}
                disabled={generating}
                style={styles.button}
                contentStyle={styles.buttonContent}
              >
                Generar Tickets
              </Button>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        color="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    paddingTop: 8,
  },
  card: {
    elevation: 4,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    color: '#666',
  },
  sorteosList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  sorteoChip: {
    marginBottom: 8,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  searchInput: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  noResults: {
    textAlign: 'center',
    color: '#666',
    padding: 16,
    fontStyle: 'italic',
  },
  button: {
    marginTop: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  ticketsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerButton: {
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    paddingVertical: 8,
    backgroundColor: '#f3e8ff',
    borderRadius: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#7b2cbf',
    fontWeight: 'bold',
    fontSize: 18,
  },
  statAvailable: {
    color: '#4caf50',
  },
  statSold: {
    color: '#ff9800',
  },
  statLabel: {
    color: '#666',
    marginTop: 2,
    fontSize: 11,
  },
  ticketsList: {
    maxHeight: 400,
    marginTop: 8,
  },
  viewMoreButton: {
    marginTop: 6,
    marginBottom: 2,
  },
  ticketCard: {
    marginBottom: 6,
    elevation: 2,
  },
  ticketContent: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  ticketInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketLeft: {
    flex: 1,
  },
  sorteoName: {
    color: '#7b2cbf',
    fontWeight: 'bold',
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  ticketRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketNumber: {
    fontWeight: '600',
    color: '#212121',
    marginBottom: 2,
    fontSize: 14,
  },
  ticketChip: {
    height: 32,
    minWidth: 100,
  },
  ticketChipAvailable: {
    backgroundColor: '#4caf50',
  },
  ticketChipSold: {
    backgroundColor: '#ff9800',
  },
  ticketChipText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  ticketChipTextAvailable: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  ticketPrice: {
    color: '#7b2cbf',
    fontWeight: '500',
    fontSize: 12,
  },
  deleteButton: {
    margin: 0,
  },
  moreTickets: {
    textAlign: 'center',
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  noTickets: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },
  sorteoCard: {
    marginBottom: 12,
    elevation: 4,
    borderRadius: 12,
  },
  sorteoCardContent: {
    padding: 12,
  },
  sorteoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sorteoCardTitle: {
    fontWeight: 'bold',
    color: '#7b2cbf',
    fontSize: 18,
    flex: 1,
  },
  deleteSorteoButton: {
    margin: 0,
  },
  divider: {
    marginVertical: 10,
    backgroundColor: '#e0e0e0',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#7b2cbf',
  },
  modalContainer: {
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontWeight: 'bold',
    color: '#212121',
  },
});

