import { useEffect, useState, useCallback, memo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Image, Alert, Linking } from 'react-native';
import { Card, Text, Button, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { format } from 'date-fns';
import { SafeLinearGradient } from '../../components/SafeLinearGradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'cache_sorteos';
const CACHE_TTL = 5 * 60 * 1000;

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

const isSorteoVencido = (fechaSorteo: string | Date): boolean => {
  return new Date(fechaSorteo) < new Date();
};

const getEstadoReal = (sorteo: any): 'activo' | 'finalizado' => {
  if (isSorteoVencido(sorteo.fecha_sorteo)) return 'finalizado';
  return sorteo.estado === 'activo' ? 'activo' : 'finalizado';
};

const SorteoCard = memo(({ sorteo, user, router }: { sorteo: any; user: any; router: any }) => {
  const estadoReal = getEstadoReal(sorteo);
  return (
    <Card
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
              source={{ uri: sorteo.imagen_portada, cache: 'force-cache' }}
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
            onPress={async (e) => {
              e.stopPropagation();
              if (!user) {
                Alert.alert(
                  'Registro Requerido',
                  'Para participar necesitas estar registrado. ¿Deseas registrarte ahora?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Registrarme', onPress: () => router.push('/(auth)/register') },
                    { text: 'Ya tengo cuenta', onPress: () => router.push('/(auth)/login') },
                  ]
                );
              } else {
                const token = await AsyncStorage.getItem('token');
                let webUrl = `https://premioclick.cl/comprar-ticket.html?sorteoId=${sorteo.id}`;
                if (token) webUrl += `&token=${encodeURIComponent(token)}&autoLogin=true`;
                Linking.openURL(webUrl);
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
});

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
    if (!forceRefresh) {
      const cached = await getCached(true);
      if (cached) {
        setSorteos(cached);
        setLoading(false);
        api.get('/sorteos').then(r => {
          setSorteos(r.data);
          setCache(r.data);
        }).catch(() => {});
        return;
      }
    }
    try {
      setLoading(true);
      const response = await api.get('/sorteos');
      setSorteos(response.data);
      setCache(response.data);
    } catch {
      if (__DEV__) console.warn('No se pudieron cargar los sorteos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSorteos(true).finally(() => setRefreshing(false));
  }, []);

  const renderItem = useCallback(({ item }: { item: any }) => (
    <SorteoCard sorteo={item} user={user} router={router} />
  ), [user, router]);

  const keyExtractor = useCallback((item: any) => String(item.id), []);

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

      <FlatList
        data={sorteos}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={10}
        initialNumToRender={4}
        updateCellsBatchingPeriod={50}
        getItemLayout={(_data, index) => ({ length: 340, offset: 340 * index, index })}
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.emptyText}>
                No hay sorteos disponibles
              </Text>
            </Card.Content>
          </Card>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 32 },
  welcomeText: { color: '#212121', fontWeight: 'bold', marginBottom: 8 },
  subtitleText: { color: '#424242', opacity: 0.9 },
  listContent: { padding: 16 },
  card: { marginBottom: 16, elevation: 8, borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff' },
  cardGradient: { borderRadius: 16 },
  cardContent: { padding: 16 },
  cardTitle: { fontWeight: 'bold', marginBottom: 8, color: '#212121', fontSize: 18 },
  cardDescription: { color: '#424242', marginBottom: 12, fontSize: 14 },
  cardInfo: { marginBottom: 8 },
  cardDate: { color: '#212121', fontWeight: '500', fontSize: 12 },
  buyButton: { marginRight: 8 },
  cardBadge: { alignSelf: 'flex-start', marginTop: 8 },
  badgeText: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: '#e0e0e0', color: '#666' },
  badgeActive: { backgroundColor: '#7b2cbf', color: '#fff' },
  badgeFinished: { backgroundColor: '#757575', color: '#fff' },
  cardActions: { padding: 8, backgroundColor: '#fff' },
  emptyCard: { marginTop: 32 },
  emptyText: { textAlign: 'center', color: '#666' },
  cardImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 12 },
});
