import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, FlatList, Linking } from 'react-native';
import { Card, Text, ActivityIndicator, Chip, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { format } from 'date-fns';
import { SafeLinearGradient } from '../../components/SafeLinearGradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MisTicketsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadTickets();
    } else {
      // Si no hay usuario, detener el loading
      setLoading(false);
    }
  }, [user]);

  const loadTickets = async () => {
    try {
      const response = await api.get('/tickets/mis-tickets');
      setTickets(response.data);
    } catch (error) {
      console.error('Error al cargar tickets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTickets();
  };

  const handleComprarTickets = async () => {
    let webUrl = 'https://premioclick.cl';
    try {
      const token = await AsyncStorage.getItem('token');
      if (token && user) {
        webUrl = `${webUrl}?token=${encodeURIComponent(token)}&autoLogin=true`;
      }
    } catch (error) {
      console.error('Error al obtener token:', error);
    }
    Linking.openURL(webUrl);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7b2cbf" />
      </View>
    );
  }

  // Si no hay usuario, mostrar mensaje de login requerido
  if (!user) {
    return (
      <View style={styles.container}>
        <SafeLinearGradient
          colors={['#ffffff', '#f3e8ff', '#e9d5ff']}
          style={styles.header}
        >
          <Text variant="headlineMedium" style={styles.welcomeText}>
            Mis Tickets
          </Text>
        </SafeLinearGradient>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.emptyText}>
                Inicia sesión para ver tus tickets
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtext}>
                Necesitas estar registrado para ver tus tickets comprados
              </Text>
            </Card.Content>
          </Card>
        </ScrollView>
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
          Mis Tickets
        </Text>
      </SafeLinearGradient>
      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id.toString()}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        initialNumToRender={10}
        windowSize={5}
        maxToRenderPerBatch={10}
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.emptyText}>
                No tienes tickets aún
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtext}>
                Participa en nuestros sorteos para obtener tickets
              </Text>
              <Button
                mode="contained"
                buttonColor="#7b2cbf"
                textColor="#fff"
                style={styles.buyButton}
                icon="ticket"
                onPress={handleComprarTickets}
              >
                Comprar Tickets
              </Button>
            </Card.Content>
          </Card>
        }
        renderItem={({ item: ticket }) => (
          <Card
            key={ticket.id}
            style={styles.card}
            mode="elevated"
            onPress={() => router.push(`/sorteo/${ticket.sorteo_id}`)}
          >
            <SafeLinearGradient
              colors={['#ffffff', '#f3e8ff', '#e9d5ff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <Card.Content style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text variant="titleMedium" style={styles.cardTitle}>
                    {ticket.sorteo_titulo}
                  </Text>
                  <Chip
                    style={[
                      styles.statusChip,
                      ticket.estado === 'ganador' && styles.statusChipWinner,
                      ticket.estado === 'vendido' && styles.statusChipSold,
                    ]}
                    textStyle={styles.statusChipText}
                  >
                    {ticket.estado === 'ganador' ? 'Ganador' : 'Vendido'}
                  </Chip>
                </View>
                <Text variant="bodyLarge" style={styles.ticketNumber}>
                  Ticket: {ticket.numero_ticket}
                </Text>
                <Text variant="bodyMedium" style={styles.ticketPrice}>
                  Precio: ${ticket.precio}
                </Text>
                {ticket.fecha_compra && (
                  <Text variant="bodySmall" style={styles.ticketDate}>
                    Comprado: {format(new Date(ticket.fecha_compra), "dd 'de' MMMM 'de' yyyy")}
                  </Text>
                )}
                {ticket.sorteo_estado === 'finalizado' && (
                  <Text variant="bodySmall" style={styles.sorteoDate}>
                    Sorteo finalizado: {format(new Date(ticket.fecha_sorteo), "dd 'de' MMMM 'de' yyyy")}
                  </Text>
                )}
              </Card.Content>
            </SafeLinearGradient>
          </Card>
        )}
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
  welcomeText: {
    color: '#212121',
    fontWeight: 'bold',
    marginBottom: 8,
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
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontWeight: 'bold',
    flex: 1,
    color: '#212121',
  },
  statusChip: {
    backgroundColor: '#7b2cbf',
  },
  statusChipWinner: {
    backgroundColor: '#ff9800',
  },
  statusChipSold: {
    backgroundColor: '#7b2cbf',
  },
  statusChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  ticketNumber: {
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  ticketPrice: {
    color: '#424242',
    marginBottom: 4,
  },
  ticketDate: {
    color: '#757575',
    marginTop: 4,
  },
  sorteoDate: {
    color: '#757575',
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyCard: {
    marginTop: 32,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#999',
  },
  buyButton: {
    marginTop: 16,
    borderRadius: 12,
  },
});

