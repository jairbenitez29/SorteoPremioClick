import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, Image, TouchableOpacity } from 'react-native';

const MAX_REQUEST_BYTES = 3.8 * 1024 * 1024;
function estimateDataUrlBytes(dataUrl: string): number {
  if (!dataUrl) return 0;
  const base64 = dataUrl.split(',')[1] || '';
  return Math.floor((base64.length * 3) / 4);
}
import { Card, Text, Button, TextInput, ActivityIndicator, IconButton, Modal, Portal } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { api } from '../../../services/api';
import { format } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRECIO_TICKET_STORAGE_KEY = (sorteoId: string | string[]) => `precio_ticket_${Array.isArray(sorteoId) ? sorteoId[0] : sorteoId}`;

export default function EditarSorteo() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
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
  const [imagenPortada, setImagenPortada] = useState<string | null>(null);
  const [precioUnitario, setPrecioUnitario] = useState('');
  const [promociones, setPromociones] = useState<Array<{ id?: number; cantidad_tickets: number; precio: number; descripcion?: string }>>([]);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoEditando, setPromoEditando] = useState<number | null>(null);
  const [promoCantidad, setPromoCantidad] = useState('');
  const [promoPrecio, setPromoPrecio] = useState('');
  const [promoDescripcion, setPromoDescripcion] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const initialImagenPortadaRef = useRef<string | null>(null);
  const imagenesDirtyRef = useRef(false);
  const promocionesDirtyRef = useRef(false);

  useEffect(() => {
    loadSorteo();
  }, [id]);

  const loadSorteo = async () => {
    try {
      // Cache-bust para obtener siempre datos frescos del servidor (precio_ticket, etc.)
      const response = await api.get(`/sorteos/${id}?_=${Date.now()}`);
      const sorteo = response.data;
      setTitulo(sorteo.titulo);
      setDescripcion(sorteo.descripcion || '');
      setLink(sorteo.link || '');
      setEstado(sorteo.estado === 'finalizado' ? 'finalizado' : 'activo');
      
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
      imagenesDirtyRef.current = false;

      const portada = sorteo.imagen_portada || null;
      setImagenPortada(portada);
      initialImagenPortadaRef.current = portada;

      // Precio unitario: priorizar valor guardado en este dispositivo (el backend puede no persistirlo)
      const storageKey = PRECIO_TICKET_STORAGE_KEY(id);
      const localPrecio = await AsyncStorage.getItem(storageKey);
      const rawPrecio = (localPrecio != null && localPrecio !== '' && !Number.isNaN(parseFloat(localPrecio)))
        ? parseFloat(localPrecio)
        : (sorteo.precio_ticket ?? (sorteo as any).precio_ticket_unitario ?? sorteo.tickets?.[0]?.precio);
      const precioTicket = rawPrecio != null ? (typeof rawPrecio === 'string' ? parseFloat(rawPrecio) : rawPrecio) : null;
      setPrecioUnitario(precioTicket != null && !Number.isNaN(precioTicket) ? String(precioTicket) : '');

      if (sorteo.productos && sorteo.productos.length > 0) {
        setProductos(sorteo.productos.map((p: any) => ({
          nombre: p.nombre,
          descripcion: p.descripcion || '',
          posicion_premio: p.posicion_premio,
        })));
      }

      // Cargar promociones (el backend puede devolver precio_total en lugar de precio)
      try {
        const promocionesResponse = await api.get(`/promociones/sorteo/${id}`);
        const promos = promocionesResponse.data || [];
        const promosFormateadas = promos.map((p: any) => {
          const precioNum = parseFloat(p.precio) || parseFloat(p.precio_total) || 0;
          return {
            ...p,
            precio: precioNum,
            cantidad_tickets: parseInt(p.cantidad_tickets) || 1,
          };
        });
        console.log('🔍 Promociones cargadas:', promosFormateadas);
        setPromociones(promosFormateadas);
        promocionesDirtyRef.current = false;
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
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos necesarios', 'Necesitamos acceso a tu galería para seleccionar imágenes');
      return;
    }
    // Sin límite de cantidad ni de recorte, igual que la imagen de portada
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      imagenesDirtyRef.current = true;
      const asset = result.assets[0];
      if (asset.base64) {
        const base64Image = `data:image/jpeg;base64,${asset.base64}`;
        setImagenes([...imagenes, base64Image]);
      } else {
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
    imagenesDirtyRef.current = true;
    setImagenes(imagenes.filter((_, i) => i !== index));
  };

  const pickImagenPortada = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos necesarios', 'Necesitamos acceso a tu galería para la imagen de portada');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      let base64Image: string;
      if (asset.base64) {
        base64Image = `data:image/jpeg;base64,${asset.base64}`;
      } else {
        try {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
          base64Image = `data:image/jpeg;base64,${base64}`;
        } catch (e) {
          Alert.alert('Error', 'No se pudo procesar la imagen');
          return;
        }
      }
      setImagenPortada(base64Image);
    }
  };

  const removeImagenPortada = () => {
    setImagenPortada(null);
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

    promocionesDirtyRef.current = true;
    if (promoEditando !== null) {
      const updated = [...promociones];
      updated[promoEditando] = {
        ...updated[promoEditando],
        cantidad_tickets: cantidad,
        precio: precio,
        descripcion: promoDescripcion || undefined,
      };
      setPromociones(updated);
    } else {
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
            promocionesDirtyRef.current = true;
            const promo = promociones[index];
            if (promo.id) {
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

    // Validar tamaño del payload antes de enviar (límite Vercel ~4MB)
    const portadaBytes = imagenPortada ? estimateDataUrlBytes(imagenPortada) : 0;
    const imagenesBytes = imagenes.reduce((acc, img) => acc + estimateDataUrlBytes(img), 0);
    if (portadaBytes + imagenesBytes > MAX_REQUEST_BYTES) {
      Alert.alert('Imágenes demasiado pesadas', 'Las imágenes superan el límite del servidor (~4MB). Reduce el tamaño o cantidad de imágenes.');
      return;
    }

    setSaving(true);
    try {
      // Siempre enviar imagen_portada e imagenes para que el servidor no las borre
      const precioTicketNum = precioUnitario ? parseFloat(precioUnitario) : null;
      const payloadSorteo: Record<string, unknown> = {
        titulo,
        descripcion,
        fecha_sorteo: fechaCompleta,
        estado,
        link: link || null,
        precio_ticket: precioTicketNum,
        imagen_portada: imagenPortada ?? null,
        imagenes: imagenes,
        productos: productos.map((p, i) => ({
          nombre: p.nombre,
          descripcion: p.descripcion,
          posicion_premio: i + 1,
        })),
      };

      try {
        await api.put(`/sorteos/${id}`, payloadSorteo);
      } catch (err: any) {
        console.error('❌ Falló PUT /sorteos:', err.response?.status, err.response?.data);
        throw err;
      }

      // Guardar precio unitario en este dispositivo (el backend puede no persistirlo aún)
      if (precioUnitario !== '' && !Number.isNaN(parseFloat(precioUnitario))) {
        await AsyncStorage.setItem(PRECIO_TICKET_STORAGE_KEY(id), precioUnitario);
      }

      // Solo tocar promociones en el backend si el usuario las modificó (evita 500 del servidor)
      if (promocionesDirtyRef.current) {
        try {
          const promocionesExistentes = await api.get(`/promociones/sorteo/${id}`);
          for (const promoExistente of promocionesExistentes.data) {
            if (!promociones.find(p => p.id === promoExistente.id)) {
              await api.delete(`/promociones/${promoExistente.id}`);
            }
          }
          for (const promo of promociones) {
            const cantidad = parseInt(String(promo.cantidad_tickets)) || 1;
            const precioNum = Number(promo.precio) || 0;
            if (promo.id) {
              // Formato que suele esperar el backend (precio_total string, activa, descuento)
              const body: Record<string, unknown> = {
                cantidad_tickets: cantidad,
                precio: precioNum,
                precio_total: precioNum.toFixed(2),
                descripcion: promo.descripcion ?? '',
                activa: 1,
                descuento: '0.00',
              };
              await api.put(`/promociones/${promo.id}`, body);
            } else {
              await api.post('/promociones', {
                sorteo_id: parseInt(id as string),
                cantidad_tickets: cantidad,
                precio: precioNum,
                precio_total: precioNum.toFixed(2),
                descripcion: promo.descripcion ?? '',
              });
            }
          }
        } catch (err: any) {
          const data = err.response?.data;
          const detail = typeof data === 'object' ? (data?.error ?? data?.message ?? JSON.stringify(data)) : String(data);
          console.error('❌ Falló actualizar promociones:', err.response?.status, detail);
          throw new Error(err.response?.status === 500 ? `Error al actualizar promoción. ${detail || 'Revisa los datos (cantidad y precio).'}` : (detail || err.message));
        }
      }

      Alert.alert('Éxito', 'Sorteo actualizado correctamente', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      if (__DEV__) console.warn('Error al actualizar:', error?.response?.data || error?.message);
      Alert.alert('Error', 'No se pudo actualizar el sorteo. Intenta de nuevo.');
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
            label="Título"
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

          <TextInput
            label="Precio unitario del ticket (CLP)"
            value={precioUnitario}
            onChangeText={setPrecioUnitario}
            mode="outlined"
            placeholder="Ej: 3000"
            style={styles.input}
            textColor="#000"
            keyboardType="numeric"
          />

          <View style={styles.dateTimeContainer}>
            <View style={styles.dateTimeRow}>
              <TextInput
                label="Fecha del Sorteo"
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
                label="Hora del Sorteo"
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
            Foto principal del sorteo
          </Text>
          <Text variant="bodySmall" style={styles.sectionSubtitle}>
            Imagen que se muestra en la lista de sorteos
          </Text>
          {imagenPortada ? (
            <View style={styles.portadaPreviewWrapper}>
              <Image source={{ uri: imagenPortada }} style={styles.portadaPreview} resizeMode="cover" />
              <View style={styles.portadaActions}>
                <Button mode="outlined" onPress={pickImagenPortada} style={styles.portadaButton}>
                  Cambiar
                </Button>
                <Button mode="outlined" textColor="#c62828" onPress={removeImagenPortada} style={styles.portadaButton}>
                  Quitar
                </Button>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.portadaPlaceholder} onPress={pickImagenPortada}>
              <Text style={styles.portadaPlaceholderText}>+ Agregar foto principal</Text>
            </TouchableOpacity>
          )}

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Fotos del Premio
          </Text>
          <Text variant="bodySmall" style={styles.sectionSubtitle}>
            Agrega las imágenes que quieras del premio (sin límite)
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

          <Text variant="bodyMedium" style={{ marginBottom: 8, fontWeight: '600' }}>Estado</Text>
          <View style={styles.estadoRow}>
            <Button
              mode={estado === 'activo' ? 'contained' : 'outlined'}
              onPress={() => setEstado('activo')}
              style={styles.estadoButton}
              buttonColor={estado === 'activo' ? '#7b2cbf' : undefined}
            >
              Activo
            </Button>
            <Button
              mode={estado === 'finalizado' ? 'contained' : 'outlined'}
              onPress={() => setEstado('finalizado')}
              style={styles.estadoButton}
              buttonColor={estado === 'finalizado' ? '#4caf50' : undefined}
            >
              Finalizado
            </Button>
          </View>

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
                  label="Nombre del Premio"
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
                label="Cantidad de Tickets"
                value={promoCantidad}
                onChangeText={setPromoCantidad}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
                textColor="#000"
              />

              <TextInput
                label="Precio Total"
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
  estadoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  estadoButton: {
    flex: 1,
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
  portadaPreviewWrapper: {
    marginBottom: 16,
  },
  portadaPreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 8,
  },
  portadaActions: {
    flexDirection: 'row',
    gap: 8,
  },
  portadaButton: {
    flex: 1,
  },
  portadaPlaceholder: {
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#7b2cbf',
    borderStyle: 'dashed',
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  portadaPlaceholderText: {
    color: '#7b2cbf',
    fontSize: 16,
    fontWeight: '600',
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

