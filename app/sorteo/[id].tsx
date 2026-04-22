import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, Dimensions, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, Text, Button, ActivityIndicator, Chip, Divider, IconButton } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { format } from 'date-fns';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

export default function SorteoDetailScreen() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { user } = useAuth();
  const [sorteo, setSorteo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [imagenModalVisible, setImagenModalVisible] = useState(false);
  const [imagenSeleccionada, setImagenSeleccionada] = useState<number>(0);
  const [imagenes, setImagenes] = useState<string[]>([]);
  const isAdmin = user?.rol === 'admin';

  useEffect(() => {
    loadSorteo();
  }, [id]);

  // Si el sorteo está finalizado y no vienen ganadores en el GET, cargarlos desde tombola para que siempre se vean
  useEffect(() => {
    if (!sorteo || sorteo.estado !== 'finalizado' || !id) return;
    if (sorteo.ganadores && sorteo.ganadores.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/tombola/ganadores/${id}`);
        const list = Array.isArray(res.data) ? res.data : [];
        if (!cancelled) setSorteo((prev: any) => prev ? { ...prev, ganadores: list } : prev);
      } catch {
        if (!cancelled) setSorteo((prev: any) => prev ? { ...prev, ganadores: [] } : prev);
      }
    })();
    return () => { cancelled = true; };
  }, [id, sorteo?.id, sorteo?.estado]);

  const loadSorteo = async () => {
    try {
      const response = await api.get(`/sorteos/${id}`);
      setSorteo(response.data);
      
      // Parsear imágenes
      const imagenesData = response.data.imagenes;
      console.log('🔍 Imágenes recibidas del backend:', imagenesData);
      console.log('🔍 Tipo de imagenesData:', typeof imagenesData);
      
      if (imagenesData) {
        try {
          const parsed = typeof imagenesData === 'string' ? JSON.parse(imagenesData) : imagenesData;
          const imagenesArray = Array.isArray(parsed) ? parsed : [];
          console.log('🔍 Imágenes parseadas:', imagenesArray);
          console.log('🔍 Cantidad de imágenes:', imagenesArray.length);
          setImagenes(imagenesArray);
        } catch (e) {
          console.error('❌ Error al parsear imágenes:', e);
          setImagenes([]);
        }
      } else {
        console.log('⚠️ No hay imágenes en el sorteo');
        setImagenes([]);
      }
    } catch (error) {
      console.error('Error al cargar sorteo:', error);
    } finally {
      setLoading(false);
    }
  };

  const abrirImagen = (index: number) => {
    setImagenSeleccionada(index);
    setImagenModalVisible(true);
  };

  const siguienteImagen = () => {
    if (imagenSeleccionada < imagenes.length - 1) {
      setImagenSeleccionada(imagenSeleccionada + 1);
    }
  };

  const anteriorImagen = () => {
    if (imagenSeleccionada > 0) {
      setImagenSeleccionada(imagenSeleccionada - 1);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7b2cbf" />
      </View>
    );
  }

  if (!sorteo) {
    return (
      <View style={styles.centerContainer}>
        <Text variant="titleLarge">Sorteo no encontrado</Text>
      </View>
    );
  }

  const estadoReal = getEstadoReal(sorteo);
  const canBuy = estadoReal === 'activo' && sorteo.estadisticas?.tickets_disponibles > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Card.Content>
          {sorteo.imagen_portada && (
            <Image
              source={{ uri: sorteo.imagen_portada }}
              style={styles.portadaImage}
              resizeMode="cover"
            />
          )}
          
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.title}>
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

          {sorteo.descripcion && (
            <Text variant="bodyMedium" style={styles.description}>
              {sorteo.descripcion}
            </Text>
          )}

          {imagenes.length > 0 && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.imagenesSection}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Fotos del Premio
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagenesGallery}>
                  {imagenes.map((imagen: string, index: number) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => abrirImagen(index)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: imagen }}
                        style={styles.galleryImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text variant="bodySmall" style={styles.imagenesHint}>
                  Toca una imagen para verla en pantalla completa
                </Text>
              </View>
            </>
          )}

          <Divider style={styles.divider} />

          <View style={styles.infoSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Fecha del Sorteo
            </Text>
            <Text variant="bodyLarge" style={styles.infoText}>
              {format(new Date(sorteo.fecha_sorteo), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm")}
            </Text>
          </View>

          <View style={styles.statsContainer}>
            {isAdmin && (
              <View style={styles.statItem}>
                <Text variant="headlineSmall" style={styles.statNumber}>
                  {sorteo.estadisticas?.tickets_disponibles || 0}
                </Text>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Disponibles
                </Text>
              </View>
            )}
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={styles.statNumber}>
                {sorteo.productos?.length || 0}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Premios
              </Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.premiosSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Premios
            </Text>
            {sorteo.productos && sorteo.productos.length > 0 ? (
              sorteo.productos.map((producto: any, index: number) => (
                <Card key={producto.id} style={styles.premioCard}>
                  <Card.Content>
                    <View style={styles.premioHeader}>
                      <Text variant="titleSmall" style={styles.premioPosition}>
                        {index + 1}° Premio
                      </Text>
                    </View>
                    <Text variant="titleMedium" style={styles.premioNombre}>
                      {producto.nombre}
                    </Text>
                    {producto.descripcion && (
                      <Text variant="bodySmall" style={styles.premioDescripcion}>
                        {producto.descripcion}
                      </Text>
                    )}
                    {producto.imagenes && Array.isArray(producto.imagenes) && producto.imagenes.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productoImagenesContainer}>
                        {producto.imagenes.map((imagen: string, imgIndex: number) => (
                          <Image
                            key={imgIndex}
                            source={{ uri: imagen }}
                            style={styles.premioImage}
                            resizeMode="cover"
                          />
                        ))}
                      </ScrollView>
                    )}
                    {/* Fallback para compatibilidad con imagen_url antigua */}
                    {(!producto.imagenes || !Array.isArray(producto.imagenes) || producto.imagenes.length === 0) && producto.imagen_url && (
                      <Image
                        source={{ uri: producto.imagen_url }}
                        style={styles.premioImage}
                        resizeMode="cover"
                      />
                    )}
                  </Card.Content>
                </Card>
              ))
            ) : (
              <Text variant="bodyMedium" style={styles.noPremios}>
                No hay premios definidos
              </Text>
            )}
          </View>

          {estadoReal === 'finalizado' && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.ganadoresSection}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Ganadores
                </Text>
                {sorteo.ganadores && sorteo.ganadores.length > 0 ? (
                  sorteo.ganadores.map((ganador: any) => (
                    <Card key={ganador.id} style={styles.ganadorCard}>
                      <Card.Content>
                        <Text variant="titleSmall" style={styles.ganadorPremio}>
                          {ganador.posicion_premio}° Premio: {ganador.producto_nombre}
                        </Text>
                        <Text variant="bodyMedium" style={styles.ganadorTicket}>
                          Ticket: {ganador.numero_ticket}
                        </Text>
                        {ganador.ganador_nombre && (
                          <Text variant="bodySmall" style={styles.ganadorNombre}>
                            Ganador: {ganador.ganador_nombre}
                          </Text>
                        )}
                        {ganador.ganador_email && (
                          <Text variant="bodySmall" style={styles.ganadorNombre}>
                            {ganador.ganador_email}
                          </Text>
                        )}
                      </Card.Content>
                    </Card>
                  ))
                ) : (
                  <Text variant="bodyMedium" style={styles.noPremios}>
                    Aún no hay ganadores publicados para este sorteo.
                  </Text>
                )}
              </View>
            </>
          )}
        </Card.Content>
      </Card>

      {canBuy && (
        <View style={styles.actionsContainer}>
          <Button
            mode="contained"
            onPress={async () => {
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
                const token = await AsyncStorage.getItem('token');
                let webUrl = `https://premioclick.cl/comprar-ticket.html?sorteoId=${id}`;
                if (token) webUrl += `&token=${encodeURIComponent(token)}&autoLogin=true`;
                Linking.openURL(webUrl);
              }
            }}
            style={styles.buyButton}
            contentStyle={styles.buyButtonContent}
          >
            Comprar Ticket
          </Button>
        </View>
      )}

      {estadoReal === 'finalizado' && (
        <View style={styles.actionsContainer}>
          <Button
            mode="outlined"
            onPress={() => router.push(`/resultados/${id}`)}
            style={styles.resultsButton}
          >
            Ver Resultados Completos
          </Button>
        </View>
      )}

      {/* Modal de imagen en pantalla completa */}
      <Modal
        visible={imagenModalVisible}
        transparent={true}
        onRequestClose={() => setImagenModalVisible(false)}
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text variant="titleMedium" style={styles.modalTitle}>
              {imagenSeleccionada + 1} / {imagenes.length}
            </Text>
            <IconButton
              icon="close"
              iconColor="#fff"
              size={24}
              onPress={() => setImagenModalVisible(false)}
              style={styles.closeButton}
            />
          </View>
          
          <View style={styles.modalImageContainer}>
            <TouchableOpacity
              style={styles.navButtonLeft}
              onPress={anteriorImagen}
              disabled={imagenSeleccionada === 0}
            >
              <IconButton
                icon="chevron-left"
                iconColor={imagenSeleccionada === 0 ? '#ccc' : '#fff'}
                size={32}
                disabled={imagenSeleccionada === 0}
              />
            </TouchableOpacity>

            <Image
              source={{ uri: imagenes[imagenSeleccionada] }}
              style={styles.modalImage}
              resizeMode="contain"
            />

            <TouchableOpacity
              style={styles.navButtonRight}
              onPress={siguienteImagen}
              disabled={imagenSeleccionada === imagenes.length - 1}
            >
              <IconButton
                icon="chevron-right"
                iconColor={imagenSeleccionada === imagenes.length - 1 ? '#ccc' : '#fff'}
                size={32}
                disabled={imagenSeleccionada === imagenes.length - 1}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  card: {
    elevation: 4,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    flex: 1,
  },
  statusChip: {
    backgroundColor: '#757575',
  },
  statusChipActive: {
    backgroundColor: '#4caf50',
  },
  statusChipText: {
    color: '#fff',
  },
  description: {
    color: '#666',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  infoSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    color: '#7b2cbf',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
    paddingVertical: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#7b2cbf',
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#666',
    marginTop: 4,
  },
  premiosSection: {
    marginTop: 8,
  },
  premioCard: {
    marginTop: 12,
    backgroundColor: '#fff3e0',
  },
  premioHeader: {
    marginBottom: 8,
  },
  premioPosition: {
    fontWeight: 'bold',
    color: '#ff9800',
  },
  premioNombre: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  premioDescripcion: {
    color: '#666',
  },
  productoImagenesContainer: {
    marginTop: 12,
  },
  premioImage: {
    width: 250,
    height: 200,
    borderRadius: 8,
    marginRight: 12,
  },
  noPremios: {
    color: '#999',
    fontStyle: 'italic',
  },
  ganadoresSection: {
    marginTop: 8,
  },
  ganadorCard: {
    marginTop: 12,
    backgroundColor: '#e8f5e9',
  },
  ganadorPremio: {
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: 4,
  },
  ganadorTicket: {
    fontWeight: '500',
    marginBottom: 4,
  },
  ganadorNombre: {
    color: '#666',
  },
  actionsContainer: {
    marginTop: 8,
  },
  buyButton: {
    marginBottom: 8,
  },
  buyButtonContent: {
    paddingVertical: 8,
  },
  resultsButton: {
    marginBottom: 8,
  },
  imagenesSection: {
    marginBottom: 16,
  },
  imagenesGallery: {
    marginTop: 12,
  },
  galleryImage: {
    width: 250,
    height: 250,
    borderRadius: 12,
    marginRight: 12,
  },
  imagenesHint: {
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  modalTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  closeButton: {
    margin: 0,
  },
  modalImageContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: screenWidth,
    height: screenHeight * 0.7,
  },
  navButtonLeft: {
    position: 'absolute',
    left: 0,
    zIndex: 1,
  },
  navButtonRight: {
    position: 'absolute',
    right: 0,
    zIndex: 1,
  },
  portadaImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: 16,
  },
});

