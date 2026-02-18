import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, ActivityIndicator, Chip, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { SafeLinearGradient } from '../../components/SafeLinearGradient';

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
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
          Panel de Administración
        </Text>
        <Text variant="bodyLarge" style={styles.subtitleText}>
          Bienvenido, {user?.nombre}
        </Text>
      </SafeLinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons name="chart-bar" size={24} color="#666" />
              <Text variant="titleLarge" style={styles.cardTitle}>
                Estadísticas Generales
              </Text>
            </View>
            <Divider style={styles.divider} />
            
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <MaterialCommunityIcons name="account-group" size={22} color="#666" />
                <Text style={styles.statNumber}>
                  {stats?.total_usuarios || 0}
                </Text>
                <Text style={styles.statLabel}>
                  Usuarios
                </Text>
              </View>

              <View style={styles.statBox}>
                <MaterialCommunityIcons name="ticket" size={22} color="#666" />
                <Text style={styles.statNumber}>
                  {stats?.total_sorteos || 0}
                </Text>
                <Text style={styles.statLabel}>
                  Sorteos
                </Text>
              </View>

              <View style={styles.statBox}>
                <MaterialCommunityIcons name="ticket-confirmation" size={22} color="#666" />
                <Text style={styles.statNumber}>
                  {stats?.total_tickets || 0}
                </Text>
                <Text style={styles.statLabel}>
                  Tickets
                </Text>
              </View>

              <View style={styles.statBox}>
                <MaterialCommunityIcons name="ticket-percent" size={22} color="#666" />
                <Text style={styles.statNumber}>
                  {stats?.tickets_vendidos || 0}
                </Text>
                <Text style={styles.statLabel}>
                  Vendidos
                </Text>
              </View>

              <View style={styles.statBox}>
                <MaterialCommunityIcons name="cash-multiple" size={22} color="#666" />
                <Text style={styles.statNumber}>
                  ${stats?.ingresos_totales || 0}
                </Text>
                <Text style={styles.statLabel}>
                  Ingresos
                </Text>
              </View>

              <View style={styles.statBox}>
                <MaterialCommunityIcons name="check-circle" size={22} color="#666" />
                <Text style={styles.statNumber}>
                  {stats?.sorteos_activos || 0}
                </Text>
                <Text style={styles.statLabel}>
                  Activos
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.actionsContainer}>
          <Card
            style={styles.actionCard}
            onPress={() => router.push('/(admin)/sorteos')}
          >
            <Card.Content style={styles.actionContent}>
              <MaterialCommunityIcons name="plus-circle" size={32} color="#666" />
              <Text style={styles.actionText}>Crear Sorteo</Text>
            </Card.Content>
          </Card>

          <Card
            style={styles.actionCard}
            onPress={() => router.push('/(admin)/tickets')}
          >
            <Card.Content style={styles.actionContent}>
              <MaterialCommunityIcons name="ticket" size={32} color="#666" />
              <Text style={styles.actionText}>Tickets</Text>
            </Card.Content>
          </Card>

          <Card
            style={styles.actionCard}
            onPress={() => router.push('/(admin)/usuarios')}
          >
            <Card.Content style={styles.actionContent}>
              <MaterialCommunityIcons name="account-group" size={32} color="#666" />
              <Text style={styles.actionText}>Usuarios</Text>
            </Card.Content>
          </Card>
        </View>
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
    paddingBottom: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  card: {
    marginBottom: 10,
    elevation: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontWeight: 'bold',
    color: '#212121',
  },
  actionsCardContent: {
    padding: 8,
  },
  divider: {
    marginVertical: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBox: {
    width: '48%',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    color: '#7b2cbf',
    fontWeight: 'bold',
    marginBottom: 2,
    fontSize: 20,
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
  },
  actionCard: {
    flex: 1,
    elevation: 2,
    minHeight: 80,
    aspectRatio: 1,
  },
  actionContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  actionText: {
    marginTop: 6,
    textAlign: 'center',
    color: '#666',
    fontWeight: '500',
    fontSize: 11,
  },
});

