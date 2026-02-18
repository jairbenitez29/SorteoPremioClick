import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, Image, TouchableOpacity } from 'react-native';
import { Card, Text, Button, TextInput, ActivityIndicator, IconButton, Modal, Portal } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { api } from '../../../services/api';
import { format } from 'date-fns';

export default function EditarSorteo() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [link, setLink] = useState('');
  const [fechaSorteo, setFechaSorteo] = useState<Date>(new Date());
  const [horaSorteo, setHoraSorteo] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [estado, setEstado] = useState('activo');
  const [productos, setProductos] = useState([{ nombre: '', descripcion: '', posicion_premio: 1 }]);
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [promociones, setPromociones] = useState<Array<{ id?: number; cantidad_tickets: number; precio: number; descripcion?: string }>>([]);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoEditando, setPromoEditando] = useState<number | null>(null);
  const [promoCantidad, setPromoCantidad] = useState('');
  const [promoPrecio, setPromoPrecio] = useState('');
  const [promoDescripcion, setPromoDescripcion] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSorteo();
  }, [id]);

  const loadSorteo = async () => {
    try {
      const response = await api.get(`/sorteos/${id}`);
      const sorteo = response.data;
      setTitulo(sorteo.titulo);
      setDescripcion(sorteo.descripcion || '');
      setLink(sorteo.link || '');
      setEstado(sorteo.estado);
      
      const fecha = new Date(sorteo.fecha_sorteo);
      setFechaSorteo(fecha);
      setHoraSorteo(fecha);
      
      // Cargar imágenes
      const imagenesData = sorteo.imagenes;
      if (imagenesData) {
        try {
          const parsed = typeof imagenesData === 'string' ? JSON.parse(imagenesData) : imagenesData;
          setImagenes(Array.isArray(parsed) ? parsed : []);
          console.log('🔍 Imágenes cargadas para editar:', Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          console.error('Error al parsear imágenes:', e);
          setImagenes([]);
        }
      } else {
        setImagenes([]);
      }
      
      if (sorteo.productos && sorteo.productos.length > 0) {
        setProductos(sorteo.productos.map((p: any) => ({
          nombre: p.nombre,
          descripcion: p.descripcion || '',
          posicion_premio: p.posicion_premio,
        })));
      }

      // Cargar promociones
      try {
        const promocionesResponse = await api.get(`/promociones/sorteo/${id}`);
        const promos = promocionesResponse.data || [];
        // Asegurar que precio y cantidad_tickets sean números
        const promosFormateadas = promos.map((p: any) => ({
          ...p,
          precio: parseFloat(p.precio) || 0,
          cantidad_tickets: parseInt(p.cantidad_tickets) || 1,
        }));
        console.log('🔍 Promociones cargadas:', promosFormateadas);
        setPromociones(promosFormateadas);
      } catch (error) {
        console.error('Error al cargar promociones:', error);
        setPromociones([]);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el sorteo');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleAddProducto = () => {
    setProductos([...productos, { nombre: '', descripcion: '', posicion_premio: productos.length + 1 }]);
  };

  const handleRemoveProducto = (index: number) => {
    if (productos.length > 1) {
      setProductos(productos.filter((_, i) => i !== index));
    }
  };

  const handleUpdateProducto = (index: number, field: string, value: string) => {
    const updated = [...productos];
    updated[index] = { ...updated[index], [field]: value };
    setProductos(updated);
  };

  const pickImage = async () => {
    if (imagenes.length >= 5) {
      Alert.alert('Límite alcanzado', 'Solo puedes agregar hasta 5 imágenes');
      return;
    }

    // Solicitar permisos
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos necesarios', 'Necesitamos acceso a tu galería para seleccionar imágenes');
      return;
    }

    // Abrir selector de imágenes
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5, // Reducir calidad para reducir tamaño (0.5 = 50%)
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      // Usar base64 si está disponible, sino usar URI
      if (asset.base64) {
        const base64Image = `data:image/jpeg;base64,${asset.base64}`;
        setImagenes([...imagenes, base64Image]);
      } else {
        // Si no hay base64, convertir la imagen a base64
        try {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const base64Image = `data:image/jpeg;base64,${base64}`;
          setImagenes([...imagenes, base64Image]);
        } catch (error) {
          console.error('Error al convertir imagen a base64:', error);
          Alert.alert('Error', 'No se pudo procesar la imagen');
        }
      }
    }
  };

  const removeImage = (index: number) => {
    setImagenes(imagenes.filter((_, i) => i !== index));
  };

  const handleAddPromocion = () => {
    setPromoEditando(null);
    setPromoCantidad('');
    setPromoPrecio('');
    setPromoDescripcion('');
    setShowPromoModal(true);
  };

  const handleEditPromocion = (index: number) => {
    const promo = promociones[index];
    if (!promo) return;
    
    setPromoEditando(index);
    setPromoCantidad(String(promo.cantidad_tickets || ''));
    setPromoPrecio(String(promo.precio || ''));
    setPromoDescripcion(promo.descripcion || '');
    setShowPromoModal(true);
  };

  const handleSavePromocion = () => {
    if (!promoCantidad || !promoPrecio) {
      Alert.alert('Error', 'Completa la cantidad de tickets y el precio');
      return;
    }

    const cantidad = parseInt(promoCantidad);
    const precio = parseFloat(promoPrecio);

    if (cantidad <= 0 || precio < 0) {
      Alert.alert('Error', 'La cantidad debe ser mayor a 0 y el precio debe ser positivo');
      return;
    }

    if (promoEditando !== null) {
      // Editar promoción existente
      const updated = [...promociones];
      updated[promoEditando] = {
        ...updated[promoEditando],
        cantidad_tickets: cantidad,
        precio: precio,
        descripcion: promoDescripcion || undefined,
      };
      setPromociones(updated);
    } else {
      // Agregar nueva promoción
      setPromociones([...promociones, {
        cantidad_tickets: cantidad,
        precio: precio,
        descripcion: promoDescripcion || undefined,
      }]);
    }

    setShowPromoModal(false);
    setPromoCantidad('');
    setPromoPrecio('');
    setPromoDescripcion('');
    setPromoEditando(null);
  };

  const handleRemovePromocion = (index: number) => {
    Alert.alert(
      'Eliminar Promoción',
      '¿Estás seguro de que deseas eliminar esta promoción?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const promo = promociones[index];
            if (promo.id) {
              // Si tiene ID, eliminar del backend
              try {
                await api.delete(`/promociones/${promo.id}`);
              } catch (error) {
                console.error('Error al eliminar promoción:', error);
              }
            }
            setPromociones(promociones.filter((_, i) => i !== index));
          },
        },
      ]
    );
  };

  const handleGuardar = async () => {
    if (!titulo) {
      Alert.alert('Error', 'Completa todos los campos obligatorios');
      return;
    }

    if (productos.some(p => !p.nombre)) {
      Alert.alert('Error', 'Todos los productos deben tener un nombre');
      return;
    }

    // Combinar fecha y hora
    const fechaStr = format(fechaSorteo, 'yyyy-MM-dd');
    const horaStr = format(horaSorteo, 'HH:mm');
    const fechaCompleta = `${fechaStr}T${horaStr}:00`;

    setSaving(true);
    try {
      // Actualizar sorteo
      await api.put(`/sorteos/${id}`, {
        titulo,
        descripcion,
        fecha_sorteo: fechaCompleta,
        estado,
        link: link || null,
        imagenes: imagenes, // Incluir imágenes actualizadas
        productos: productos.map((p, i) => ({
          nombre: p.nombre,
          descripcion: p.descripcion,
          posicion_premio: i + 1,
        })),
      });

      // Actualizar promociones
      // Primero obtener promociones existentes del backend
      const promocionesExistentes = await api.get(`/promociones/sorteo/${id}`);
      const idsExistentes = promocionesExistentes.data.map((p: any) => p.id);

      // Eliminar promociones que ya no están en la lista
      for (const promoExistente of promocionesExistentes.data) {
        if (!promociones.find(p => p.id === promoExistente.id)) {
          await api.delete(`/promociones/${promoExistente.id}`);
        }
      }

      // Crear o actualizar promociones
      for (const promo of promociones) {
        if (promo.id) {
          // Actualizar promoción existente
          await api.put(`/promociones/${promo.id}`, {
            cantidad_tickets: promo.cantidad_tickets,
            precio: promo.precio,
            descripcion: promo.descripcion,
            activa: true,
          });
        } else {
          // Crear nueva promoción
          await api.post('/promociones', {
            sorteo_id: parseInt(id as string),
            cantidad_tickets: promo.cantidad_tickets,
            precio: promo.precio,
            descripcion: promo.descripcion,
          });
        }
      }

      Alert.alert('Éxito', 'Sorteo actualizado correctamente', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error al actualizar:', error);
      Alert.alert('Error', error.response?.data?.error || 'No se pudo actualizar el sorteo');
    } finally {
      setSaving(false);
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
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.title}>
            Editar Sorteo
          </Text>

          <TextInput
            label="Título *"
            value={titulo}
            onChangeText={setTitulo}
            mode="outlined"
            style={styles.input}
            textColor="#000"
          />

          <TextInput
            label="Descripción"
            value={descripcion}
            onChangeText={setDescripcion}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            textColor="#000"
          />

          <TextInput
            label="Link de la página web"
            value={link}
            onChangeText={setLink}
            mode="outlined"
            placeholder="https://ejemplo.com/sorteo"
            style={styles.input}
            textColor="#000"
            keyboardType="url"
          />

          <View style={styles.dateTimeContainer}>
            <View style={styles.dateTimeRow}>
              <TextInput
                label="Fecha del Sorteo *"
                value={format(fechaSorteo, 'dd/MM/yyyy')}
                mode="outlined"
                style={[styles.input, styles.dateInput]}
                textColor="#000"
                editable={false}
                right={
                  <TextInput.Icon
                    icon="calendar"
                    onPress={() => setShowDatePicker(true)}
                  />
                }
              />
              <TextInput
                label="Hora del Sorteo *"
                value={format(horaSorteo, 'HH:mm')}
                mode="outlined"
                style={[styles.input, styles.timeInput]}
                textColor="#000"
                editable={false}
                right={
                  <TextInput.Icon
                    icon="clock-outline"
                    onPress={() => setShowTimePicker(true)}
                  />
                }
              />
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={fechaSorteo}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate && event.type !== 'dismissed') {
                  setFechaSorteo(selectedDate);
                }
              }}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={horaSorteo}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedTime) => {
                setShowTimePicker(false);
                if (selectedTime && event.type !== 'dismissed') {
                  setHoraSorteo(selectedTime);
                }
              }}
            />
          )}

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Fotos del Premio
          </Text>
          <Text variant="bodySmall" style={styles.sectionSubtitle}>
            Puedes agregar hasta 5 imágenes del premio
          </Text>
          
          <View style={styles.imagesContainer}>
            {imagenes.map((uri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.imagePreview} />
                <IconButton
                  icon="close"
                  size={20}
                  iconColor="#fff"
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                />
              </View>
            ))}
            {imagenes.length < 5 && (
              <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                <Text style={styles.addImageText}>+</Text>
                <Text style={styles.addImageLabel}>Agregar</Text>
              </TouchableOpacity>
            )}
          </View>

          <TextInput
            label="Estado"
            value={estado}
            onChangeText={setEstado}
            mode="outlined"
            style={styles.input}
            textColor="#000"
          />

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Premios
          </Text>

          {productos.map((producto, index) => (
            <Card key={index} style={styles.productoCard}>
              <Card.Content>
                <Text variant="bodyMedium" style={styles.productoTitle}>
                  Premio {index + 1}
                </Text>
                <TextInput
                  label="Nombre del Premio *"
                  value={producto.nombre}
                  onChangeText={(value) => handleUpdateProducto(index, 'nombre', value)}
                  mode="outlined"
                  style={styles.input}
                  textColor="#000"
                />
                <TextInput
                  label="Descripción"
                  value={producto.descripcion}
                  onChangeText={(value) => handleUpdateProducto(index, 'descripcion', value)}
                  mode="outlined"
                  multiline
                  style={styles.input}
                  textColor="#000"
                />
                {productos.length > 1 && (
                  <Button
                    mode="text"
                    onPress={() => handleRemoveProducto(index)}
                    textColor="#d32f2f"
                  >
                    Eliminar Premio
                  </Button>
                )}
              </Card.Content>
            </Card>
          ))}

          <Button
            mode="outlined"
            onPress={handleAddProducto}
            style={styles.addButton}
          >
            Agregar Premio
          </Button>

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Promociones
          </Text>
          <Text variant="bodySmall" style={styles.sectionSubtitle}>
            Gestiona las promociones de este sorteo
          </Text>

          {promociones
            .filter((promo) => {
              if (!promo) return false;
              const precio = promo.precio != null ? parseFloat(promo.precio) : null;
              const cantidad = promo.cantidad_tickets != null ? parseInt(promo.cantidad_tickets) : null;
              return precio !== null && !isNaN(precio) && cantidad !== null && !isNaN(cantidad);
            })
            .map((promo, index) => {
              const precio = parseFloat(String(promo.precio || 0)) || 0;
              const cantidad = parseInt(String(promo.cantidad_tickets || 1)) || 1;
              
              return (
                <Card key={promo.id || `promo-${index}`} style={styles.promoCard}>
                  <Card.Content>
                    <View style={styles.promoHeader}>
                      <View style={styles.promoInfo}>
                        <Text variant="bodyMedium" style={styles.promoTitle}>
                          {cantidad} Tickets
                        </Text>
                        <Text variant="bodySmall" style={styles.promoPrice}>
                          ${precio.toFixed(0)}
                        </Text>
                        {promo.descripcion && (
                          <Text variant="bodySmall" style={styles.promoDesc}>
                            {promo.descripcion}
                          </Text>
                        )}
                      </View>
                      <View style={styles.promoActions}>
                        <IconButton
                          icon="pencil"
                          iconColor="#7b2cbf"
                          size={20}
                          onPress={() => handleEditPromocion(index)}
                        />
                        <IconButton
                          icon="delete"
                          iconColor="#d32f2f"
                          size={20}
                          onPress={() => handleRemovePromocion(index)}
                        />
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              );
            })}

          <Button
            mode="outlined"
            onPress={handleAddPromocion}
            style={styles.addButton}
            icon="tag-plus"
          >
            Agregar Promoción
          </Button>

          <Button
            mode="contained"
            onPress={handleGuardar}
            loading={saving}
            disabled={saving}
            style={styles.saveButton}
            contentStyle={styles.saveButtonContent}
          >
            Guardar Cambios
          </Button>
        </Card.Content>
      </Card>

      <Portal>
        <Modal
          visible={showPromoModal}
          onDismiss={() => setShowPromoModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Card>
            <Card.Content>
              <Text variant="titleLarge" style={styles.modalTitle}>
                {promoEditando !== null ? 'Editar Promoción' : 'Nueva Promoción'}
              </Text>

              <TextInput
                label="Cantidad de Tickets *"
                value={promoCantidad}
                onChangeText={setPromoCantidad}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
                textColor="#000"
              />

              <TextInput
                label="Precio Total *"
                value={promoPrecio}
                onChangeText={setPromoPrecio}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
                textColor="#000"
              />

              <TextInput
                label="Descripción (opcional)"
                value={promoDescripcion}
                onChangeText={setPromoDescripcion}
                mode="outlined"
                style={styles.input}
                textColor="#000"
              />

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setShowPromoModal(false);
                    setPromoCantidad('');
                    setPromoPrecio('');
                    setPromoDescripcion('');
                    setPromoEditando(null);
                  }}
                  style={styles.modalButton}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSavePromocion}
                  style={styles.modalButton}
                  buttonColor="#7b2cbf"
                >
                  Guardar
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>
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
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  dateTimeContainer: {
    marginBottom: 16,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateInput: {
    flex: 1,
  },
  timeInput: {
    flex: 1,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 12,
  },
  imageWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    margin: 0,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#7b2cbf',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3e8ff',
  },
  addImageText: {
    fontSize: 32,
    color: '#7b2cbf',
    fontWeight: 'bold',
  },
  addImageLabel: {
    fontSize: 12,
    color: '#7b2cbf',
    marginTop: 4,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
  },
  productoCard: {
    marginBottom: 16,
    backgroundColor: '#fff3e0',
  },
  productoTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#ff9800',
  },
  addButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 8,
  },
  saveButtonContent: {
    paddingVertical: 8,
  },
  sectionSubtitle: {
    color: '#666',
    marginBottom: 12,
    fontSize: 12,
  },
  promoCard: {
    marginBottom: 12,
    backgroundColor: '#e8f5e9',
  },
  promoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promoInfo: {
    flex: 1,
  },
  promoTitle: {
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: 4,
  },
  promoPrice: {
    color: '#212121',
    fontWeight: '600',
    fontSize: 16,
  },
  promoDesc: {
    color: '#666',
    marginTop: 4,
    fontSize: 12,
  },
  promoActions: {
    flexDirection: 'row',
  },
  modalContent: {
    padding: 20,
    margin: 20,
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    fontSize: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  modalButton: {
    marginLeft: 8,
  },
});

