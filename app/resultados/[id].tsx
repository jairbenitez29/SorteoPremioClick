import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../services/api';

export default function ResultadosScreen() {
  const { id } = useLocalSearchParams();
  const [ganadores, setGanadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGanadores();
  }, [id]);

  const loadGanadores = async () => {
    try {
      const response = await api.get(`/tombola/ganadores/${id}`);
      setGanadores(response.data);
    } catch (error) {
      console.error('Error al cargar ganadores:', error);
    } finally {
      setLoading(false);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.headerTitle}>
            Resultados del Sorteo
          </Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>
            {ganadores.length} ganador{ganadores.length !== 1 ? 'es' : ''}
          </Text>
        </Card.Content>
      </Card>

      {ganadores.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.emptyText}>
              Aún no hay ganadores
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              El sorteo aún no se ha realizado
            </Text>
          </Card.Content>
        </Card>
      ) : (
        ganadores.map((ganador, index) => (
          <Card key={ganador.id} style={styles.ganadorCard}>
            <Card.Content>
              <View style={styles.ganadorHeader}>
                <View style={styles.positionBadge}>
                  <Text variant="headlineSmall" style={styles.positionText}>
                    {ganador.posicion_premio}°
                  </Text>
                </View>
                <View style={styles.ganadorInfo}>
                  <Text variant="titleLarge" style={styles.premioNombre}>
                    {ganador.producto_nombre}
                  </Text>
                  {ganador.producto_descripcion && (
                    <Text variant="bodyMedium" style={styles.premioDescripcion}>
                      {ganador.producto_descripcion}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.ticketInfo}>
                <Text variant="titleMedium" style={styles.ticketLabel}>
                  Ticket Ganador:
                </Text>
                <Text variant="headlineSmall" style={styles.ticketNumber}>
                  {ganador.numero_ticket}
                </Text>
              </View>

              {ganador.ganador_nombre && (
                <View style={styles.ganadorDetails}>
                  <Text variant="bodyLarge" style={styles.ganadorNombre}>
                    {ganador.ganador_nombre}
                  </Text>
                  {ganador.ganador_email && (
                    <Text variant="bodyMedium" style={styles.ganadorEmail}>
                      {ganador.ganador_email}
                    </Text>
                  )}
                  {ganador.ganador_telefono && (
                    <Text variant="bodyMedium" style={styles.ganadorTelefono}>
                      {ganador.ganador_telefono}
                    </Text>
                  )}
                </View>
              )}
            </Card.Content>
          </Card>
        ))
      )}
    </ScrollView>
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
  content: {
    padding: 16,
  },
  headerCard: {
    backgroundColor: '#7b2cbf',
    marginBottom: 16,
    elevation: 4,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.9,
  },
  ganadorCard: {
    marginBottom: 16,
    elevation: 4,
    backgroundColor: '#fff',
  },
  ganadorHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  positionBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff9800',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  positionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  ganadorInfo: {
    flex: 1,
  },
  premioNombre: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  premioDescripcion: {
    color: '#666',
  },
  ticketInfo: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  ticketLabel: {
    color: '#666',
    marginBottom: 4,
  },
  ticketNumber: {
    color: '#7b2cbf',
    fontWeight: 'bold',
  },
  ganadorDetails: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  ganadorNombre: {
    fontWeight: '500',
    marginBottom: 4,
  },
  ganadorEmail: {
    color: '#666',
    marginBottom: 4,
  },
  ganadorTelefono: {
    color: '#666',
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
});

