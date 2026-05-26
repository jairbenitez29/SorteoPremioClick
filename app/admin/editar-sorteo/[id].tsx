import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, Image, TouchableOpacity } from 'react-native';

const MAX_REQUEST_BYTES = 3.8 * 1024 * 1024;
function estimateDataUrlBytes(dataUrl: string): number {
  if (!dataUrl) return 0;
  const base64 = dataUrl.split(',')[1] || '';
  return Math.floor((base64.length * 3) / 4);
}
import { Card, Text, Button, TextInput, ActivityIndicator, IconButton, Modal, Portal, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { api } from '../../../services/api';
import { format } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeLinearGradient } from '../../../components/SafeLinearGradient';

const PRECIO_TICKET_STORAGE_KEY = (sorteoId: string | string[]) => `precio_ticket_${Array.isArray(sorteoId) ? sorteoId[0] : sorteoId}`;

// Pasos del flujo de posponer con tickets vendidos
type PosponerStep = 'explicacion' | 'decision' | 'confirmar_participan' | 'confirmar_anulan' | null;

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

  // Estado para el flujo de posponer con tickets vendidos
  const [posponerStep, setPosponerStep] = useState<PosponerStep>(null);
  const [ticketsVendidosCount, setTicketsVendidosCount] = useState(0);
  const [anularVendidosDecision, setAnularVendidosDecision] = useState<boolean | null>(null);
  const pendingSaveRef = useRef<{ anularVendidos: boolean } | null>(null);

  useEffect(() => {
    loadSorteo();
  }, [id]);

  const loadSorteo = async () => {
    try {
      const response = await api.get(`/sorteos/${id}?_=${Date.now()}`);
      const sorteo = response.data;
      setTitulo(sorteo.titulo);
      setDescripcion(sorteo.descripcion || '');
      setLink(sorteo.link || '');
      const fecha = new Date(sorteo.fecha_sorteo);
      setFechaSorteo(fecha);
      setHoraSorteo(fecha);

      const imagenesData = sorteo.imagenes;
      if (imagenesData) {
        try {
          const parsed = typeof imagenesData === 'string' ? JSON.parse(imagenesData) : imagenesData;
          setImagenes(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          setImagenes([]);
        }
      } else {
        setImagenes([]);
      }
      imagenesDirtyRef.current = false;

      const portada = sorteo.imagen_portada || null;
      setImagenPortada(portada);
      initialImagenPortadaRef.current = portada;

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
        setPromociones(promosFormateadas);
        promocionesDirtyRef.current = false;
      } catch (error) {
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
        setImagenes([...imagenes, `data:image/jpeg;base64,${asset.base64}`]);
      } else {
        try {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
          setImagenes([...imagenes, `data:image/jpeg;base64,${base64}`]);
        } catch (error) {
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
      if (asset.base64) {
        setImagenPortada(`data:image/jpeg;base64,${asset.base64}`);
      } else {
        try {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
          setImagenPortada(`data:image/jpeg;base64,${base64}`);
        } catch (e) {
          Alert.alert('Error', 'No se pudo procesar la imagen');
        }
      }
    }
  };

  const removeImagenPortada = () => setImagenPortada(null);

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
      updated[promoEditando] = { ...updated[promoEditando], cantidad_tickets: cantidad, precio, descripcion: promoDescripcion || undefined };
      setPromociones(updated);
    } else {
      setPromociones([...promociones, { cantidad_tickets: cantidad, precio, descripcion: promoDescripcion || undefined }]);
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
              try { await api.delete(`/promociones/${promo.id}`); } catch {}
            }
            setPromociones(promociones.filter((_, i) => i !== index));
          },
        },
      ]
    );
  };

  // Ejecutar el guardado real con la decisión ya tomada
  const ejecutarGuardado = async (anularVendidos: boolean) => {
    setSaving(true);
    setPosponerStep(null);
    try {
      const fechaStr = format(fechaSorteo, 'yyyy-MM-dd');
      const horaStr = format(horaSorteo, 'HH:mm');
      const fechaCompleta = `${fechaStr}T${horaStr}:00`;

      const precioTicketNum = precioUnitario ? parseFloat(precioUnitario) : null;
      const payloadSorteo: Record<string, unknown> = {
        titulo,
        descripcion,
        fecha_sorteo: fechaCompleta,
        link: link || null,
        precio_ticket: precioTicketNum,
        imagen_portada: imagenPortada ?? null,
        imagenes,
        anularVendidos,
        productos: productos.map((p, i) => ({
          nombre: p.nombre,
          descripcion: p.descripcion,
          posicion_premio: i + 1,
        })),
      };

      await api.put(`/sorteos/${id}`, payloadSorteo);

      if (precioUnitario !== '' && !Number.isNaN(parseFloat(precioUnitario))) {
        await AsyncStorage.setItem(PRECIO_TICKET_STORAGE_KEY(id), precioUnitario);
      }

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
              await api.put(`/promociones/${promo.id}`, {
                cantidad_tickets: cantidad,
                precio: precioNum,
                precio_total: precioNum.toFixed(2),
                descripcion: promo.descripcion ?? '',
                activa: 1,
                descuento: '0.00',
              });
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
          throw new Error(err.response?.status === 500 ? `Error al actualizar promoción. ${detail || 'Revisa los datos.'}` : (detail || err.message));
        }
      }

      Alert.alert('Listo', 'El sorteo fue actualizado correctamente', [
        { text: 'Aceptar', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      if (__DEV__) console.warn('Error al actualizar:', error?.response?.data || error?.message);
      Alert.alert('Error', 'No se pudo actualizar el sorteo. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // Punto de entrada del guardado — detecta si hace falta el flujo de posponer
  const handleGuardar = async () => {
    if (!titulo) {
      Alert.alert('Error', 'Completa todos los campos obligatorios');
      return;
    }
    if (productos.some(p => !p.nombre)) {
      Alert.alert('Error', 'Todos los productos deben tener un nombre');
      return;
    }

    const portadaBytes = imagenPortada ? estimateDataUrlBytes(imagenPortada) : 0;
    const imagenesBytes = imagenes.reduce((acc, img) => acc + estimateDataUrlBytes(img), 0);
    if (portadaBytes + imagenesBytes > MAX_REQUEST_BYTES) {
      Alert.alert('Imágenes demasiado pesadas', 'Las imágenes superan el límite del servidor. Reduce el tamaño o cantidad.');
      return;
    }

    // ¿La nueva fecha es futura?
    const fechaStr = format(fechaSorteo, 'yyyy-MM-dd');
    const horaStr = format(horaSorteo, 'HH:mm');
    const fechaCompleta = new Date(`${fechaStr}T${horaStr}:00`);
    const esFutura = fechaCompleta > new Date();

    if (esFutura) {
      try {
        const response = await api.get(`/tickets/sorteo/${id}/vendidos-count`);
        const total = response.data?.total ?? 0;
        if (total > 0) {
          setTicketsVendidosCount(total);
          setPosponerStep('explicacion');
          return;
        }
      } catch {
        // Si falla la consulta, guardar sin flujo especial
      }
    }

    await ejecutarGuardado(false);
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
          <Text variant="titleLarge" style={styles.title}>Editar Sorteo</Text>

          <TextInput label="Título" value={titulo} onChangeText={setTitulo} mode="outlined" style={styles.input} textColor="#000" />
          <TextInput label="Descripción" value={descripcion} onChangeText={setDescripcion} mode="outlined" multiline numberOfLines={3} style={styles.input} textColor="#000" />
          <TextInput label="Link de la página web" value={link} onChangeText={setLink} mode="outlined" placeholder="https://ejemplo.com/sorteo" style={styles.input} textColor="#000" keyboardType="url" />
          <TextInput label="Precio unitario del ticket (CLP)" value={precioUnitario} onChangeText={setPrecioUnitario} mode="outlined" placeholder="Ej: 3000" style={styles.input} textColor="#000" keyboardType="numeric" />

          <View style={styles.dateTimeContainer}>
            <View style={styles.dateTimeRow}>
              <TextInput
                label="Fecha del Sorteo"
                value={format(fechaSorteo, 'dd/MM/yyyy')}
                mode="outlined"
                style={[styles.input, styles.dateInput]}
                textColor="#000"
                editable={false}
                right={<TextInput.Icon icon="calendar" onPress={() => setShowDatePicker(true)} />}
              />
              <TextInput
                label="Hora del Sorteo"
                value={format(horaSorteo, 'HH:mm')}
                mode="outlined"
                style={[styles.input, styles.timeInput]}
                textColor="#000"
                editable={false}
                right={<TextInput.Icon icon="clock-outline" onPress={() => setShowTimePicker(true)} />}
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
                if (selectedDate && event.type !== 'dismissed') setFechaSorteo(selectedDate);
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
                if (selectedTime && event.type !== 'dismissed') setHoraSorteo(selectedTime);
              }}
            />
          )}

          <Text variant="titleMedium" style={styles.sectionTitle}>Foto principal del sorteo</Text>
          <Text variant="bodySmall" style={styles.sectionSubtitle}>Imagen que se muestra en la lista de sorteos</Text>
          {imagenPortada ? (
            <View style={styles.portadaPreviewWrapper}>
              <Image source={{ uri: imagenPortada }} style={styles.portadaPreview} resizeMode="cover" />
              <View style={styles.portadaActions}>
                <Button mode="outlined" onPress={pickImagenPortada} style={styles.portadaButton}>Cambiar</Button>
                <Button mode="outlined" textColor="#c62828" onPress={removeImagenPortada} style={styles.portadaButton}>Quitar</Button>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.portadaPlaceholder} onPress={pickImagenPortada}>
              <Text style={styles.portadaPlaceholderText}>+ Agregar foto principal</Text>
            </TouchableOpacity>
          )}

          <Text variant="titleMedium" style={styles.sectionTitle}>Fotos del Premio</Text>
          <Text variant="bodySmall" style={styles.sectionSubtitle}>Agrega las imágenes que quieras del premio</Text>
          <View style={styles.imagesContainer}>
            {imagenes.map((uri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.imagePreview} />
                <IconButton icon="close" size={20} iconColor="#fff" style={styles.removeImageButton} onPress={() => removeImage(index)} />
              </View>
            ))}
            {imagenes.length < 10 && (
              <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                <Text style={styles.addImageText}>+</Text>
                <Text style={styles.addImageLabel}>Agregar</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text variant="titleMedium" style={styles.sectionTitle}>Premios</Text>
          {productos.map((producto, index) => (
            <Card key={index} style={styles.productoCard}>
              <Card.Content>
                <Text variant="bodyMedium" style={styles.productoTitle}>Premio {index + 1}</Text>
                <TextInput label="Nombre del Premio" value={producto.nombre} onChangeText={(value) => handleUpdateProducto(index, 'nombre', value)} mode="outlined" style={styles.input} textColor="#000" />
                <TextInput label="Descripción" value={producto.descripcion} onChangeText={(value) => handleUpdateProducto(index, 'descripcion', value)} mode="outlined" multiline style={styles.input} textColor="#000" />
                {productos.length > 1 && (
                  <Button mode="text" onPress={() => handleRemoveProducto(index)} textColor="#d32f2f">Eliminar Premio</Button>
                )}
              </Card.Content>
            </Card>
          ))}
          <Button mode="outlined" onPress={handleAddProducto} style={styles.addButton}>Agregar Premio</Button>

          <Text variant="titleMedium" style={styles.sectionTitle}>Promociones</Text>
          <Text variant="bodySmall" style={styles.sectionSubtitle}>Gestiona las promociones de este sorteo</Text>
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
                        <Text variant="bodyMedium" style={styles.promoTitle}>{cantidad} Tickets</Text>
                        <Text variant="bodySmall" style={styles.promoPrice}>${precio.toFixed(0)}</Text>
                        {promo.descripcion && <Text variant="bodySmall" style={styles.promoDesc}>{promo.descripcion}</Text>}
                      </View>
                      <View style={styles.promoActions}>
                        <IconButton icon="pencil" iconColor="#7b2cbf" size={20} onPress={() => handleEditPromocion(index)} />
                        <IconButton icon="delete" iconColor="#d32f2f" size={20} onPress={() => handleRemovePromocion(index)} />
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              );
            })}
          <Button mode="outlined" onPress={handleAddPromocion} style={styles.addButton} icon="tag-plus">Agregar Promoción</Button>

          <Button
            mode="contained"
            onPress={handleGuardar}
            loading={saving}
            disabled={saving}
            style={styles.saveButton}
            buttonColor="#7b2cbf"
            contentStyle={styles.saveButtonContent}
          >
            Guardar Cambios
          </Button>
        </Card.Content>
      </Card>

      {/* ---- MODALES PREMIUM ---- */}
      <Portal>

        {/* Modal de Promoción */}
        <Modal visible={showPromoModal} onDismiss={() => setShowPromoModal(false)} contentContainerStyle={styles.modalContainer}>
          <Card style={styles.modalCard}>
            <SafeLinearGradient colors={['#7b2cbf', '#9c4dcc']} style={styles.modalHeader}>
              <IconButton icon="tag-plus" iconColor="#fff" size={28} style={{ margin: 0 }} />
              <Text style={styles.modalHeaderTitle}>{promoEditando !== null ? 'Editar Promoción' : 'Nueva Promoción'}</Text>
            </SafeLinearGradient>
            <Card.Content style={styles.modalBody}>
              <TextInput label="Cantidad de Tickets" value={promoCantidad} onChangeText={setPromoCantidad} mode="outlined" keyboardType="numeric" style={styles.input} textColor="#000" />
              <TextInput label="Precio Total" value={promoPrecio} onChangeText={setPromoPrecio} mode="outlined" keyboardType="numeric" style={styles.input} textColor="#000" />
              <TextInput label="Descripción (opcional)" value={promoDescripcion} onChangeText={setPromoDescripcion} mode="outlined" style={styles.input} textColor="#000" />
              <View style={styles.modalFooter}>
                <Button mode="outlined" onPress={() => { setShowPromoModal(false); setPromoCantidad(''); setPromoPrecio(''); setPromoDescripcion(''); setPromoEditando(null); }} style={styles.modalBtnSecondary} textColor="#7b2cbf">
                  Cancelar
                </Button>
                <Button mode="contained" onPress={handleSavePromocion} buttonColor="#7b2cbf" style={styles.modalBtnPrimary}>
                  Guardar
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>

        {/* PASO 1: Modal de explicación — qué significa posponer */}
        <Modal
          visible={posponerStep === 'explicacion'}
          onDismiss={() => setPosponerStep(null)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.modalCard}>
            <SafeLinearGradient colors={['#5c35a0', '#7b2cbf']} style={styles.modalHeader}>
              <IconButton icon="calendar-clock" iconColor="#fff" size={28} style={{ margin: 0 }} />
              <Text style={styles.modalHeaderTitle}>Cambio de fecha detectado</Text>
            </SafeLinearGradient>
            <Card.Content style={styles.modalBody}>
              <View style={styles.infoRow}>
                <IconButton icon="information-outline" iconColor="#7b2cbf" size={22} style={{ margin: 0 }} />
                <Text variant="bodyMedium" style={styles.infoText}>
                  La nueva fecha programada es posterior a hoy, por lo que el sorteo quedará en estado activo.
                </Text>
              </View>
              <Divider style={styles.divider} />
              <View style={styles.alertBox}>
                <IconButton icon="ticket-account" iconColor="#7b2cbf" size={22} style={{ margin: 0, alignSelf: 'flex-start' }} />
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall" style={styles.alertBoxTitle}>
                    Hay {ticketsVendidosCount} ticket{ticketsVendidosCount !== 1 ? 's' : ''} ya vendido{ticketsVendidosCount !== 1 ? 's' : ''}
                  </Text>
                  <Text variant="bodySmall" style={styles.alertBoxText}>
                    Antes de guardar, debes decidir qué sucede con los tickets que ya fueron adquiridos por participantes.
                  </Text>
                </View>
              </View>
              <View style={styles.modalFooter}>
                <Button mode="outlined" onPress={() => setPosponerStep(null)} style={styles.modalBtnSecondary} textColor="#7b2cbf">
                  Cancelar
                </Button>
                <Button mode="contained" buttonColor="#7b2cbf" onPress={() => setPosponerStep('decision')} style={styles.modalBtnPrimary} icon="arrow-right">
                  Continuar
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>

        {/* PASO 2: Modal de decisión — participan o se anulan */}
        <Modal
          visible={posponerStep === 'decision'}
          onDismiss={() => setPosponerStep(null)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.modalCard}>
            <SafeLinearGradient colors={['#5c35a0', '#7b2cbf']} style={styles.modalHeader}>
              <IconButton icon="help-circle-outline" iconColor="#fff" size={28} style={{ margin: 0 }} />
              <Text style={styles.modalHeaderTitle}>Tickets vendidos</Text>
            </SafeLinearGradient>
            <Card.Content style={styles.modalBody}>
              <Text variant="bodyMedium" style={styles.decisionQuestion}>
                ¿Qué debe ocurrir con los {ticketsVendidosCount} ticket{ticketsVendidosCount !== 1 ? 's' : ''} ya vendido{ticketsVendidosCount !== 1 ? 's' : ''}?
              </Text>

              {/* Opción A: Sí participan */}
              <TouchableOpacity
                style={[styles.optionCard, anularVendidosDecision === false && styles.optionCardSelected]}
                onPress={() => setAnularVendidosDecision(false)}
                activeOpacity={0.8}
              >
                <View style={styles.optionIconWrap}>
                  <IconButton icon="check-circle-outline" iconColor={anularVendidosDecision === false ? '#fff' : '#7b2cbf'} size={26} style={{ margin: 0 }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, anularVendidosDecision === false && styles.optionTitleSelected]}>
                    Sí participan en el nuevo sorteo
                  </Text>
                  <Text style={[styles.optionDesc, anularVendidosDecision === false && styles.optionDescSelected]}>
                    Los tickets vendidos conservan su validez y seguirán en el sorteo cuando llegue la nueva fecha.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Opción B: Se anulan */}
              <TouchableOpacity
                style={[styles.optionCard, anularVendidosDecision === true && styles.optionCardDanger]}
                onPress={() => setAnularVendidosDecision(true)}
                activeOpacity={0.8}
              >
                <View style={styles.optionIconWrap}>
                  <IconButton icon="close-circle-outline" iconColor={anularVendidosDecision === true ? '#fff' : '#c62828'} size={26} style={{ margin: 0 }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, anularVendidosDecision === true && styles.optionTitleDanger]}>
                    No participan, se anulan
                  </Text>
                  <Text style={[styles.optionDesc, anularVendidosDecision === true && styles.optionDescDanger]}>
                    Los tickets vendidos quedan anulados y sus números vuelven a estar disponibles para nuevos compradores.
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.modalFooter}>
                <Button mode="outlined" onPress={() => setPosponerStep('explicacion')} style={styles.modalBtnSecondary} textColor="#7b2cbf" icon="arrow-left">
                  Atrás
                </Button>
                <Button
                  mode="contained"
                  buttonColor="#7b2cbf"
                  disabled={anularVendidosDecision === null}
                  onPress={() => {
                    if (anularVendidosDecision === false) setPosponerStep('confirmar_participan');
                    else setPosponerStep('confirmar_anulan');
                  }}
                  style={styles.modalBtnPrimary}
                  icon="arrow-right"
                >
                  Siguiente
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>

        {/* PASO 3A: Confirmación — Sí participan */}
        <Modal
          visible={posponerStep === 'confirmar_participan'}
          onDismiss={() => setPosponerStep(null)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.modalCard}>
            <SafeLinearGradient colors={['#2e7d32', '#43a047']} style={styles.modalHeader}>
              <IconButton icon="shield-check-outline" iconColor="#fff" size={28} style={{ margin: 0 }} />
              <Text style={styles.modalHeaderTitle}>Confirmar cambios</Text>
            </SafeLinearGradient>
            <Card.Content style={styles.modalBody}>
              <View style={styles.confirmBox}>
                <IconButton icon="calendar-check" iconColor="#2e7d32" size={22} style={{ margin: 0, alignSelf: 'flex-start' }} />
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall" style={[styles.alertBoxTitle, { color: '#2e7d32' }]}>
                    Sorteo reprogramado
                  </Text>
                  <Text variant="bodySmall" style={styles.alertBoxText}>
                    El sorteo quedará activo con la nueva fecha. Los {ticketsVendidosCount} tickets ya vendidos mantienen su validez y participarán normalmente.
                  </Text>
                </View>
              </View>
              <Text variant="bodySmall" style={styles.confirmNote}>
                ¿Confirmas que deseas guardar estos cambios?
              </Text>
              <View style={styles.modalFooter}>
                <Button mode="outlined" onPress={() => setPosponerStep('decision')} style={styles.modalBtnSecondary} textColor="#7b2cbf" icon="arrow-left">
                  Atrás
                </Button>
                <Button
                  mode="contained"
                  buttonColor="#2e7d32"
                  onPress={() => ejecutarGuardado(false)}
                  loading={saving}
                  style={styles.modalBtnPrimary}
                  icon="check"
                >
                  Confirmar
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>

        {/* PASO 3B: Confirmación — Se anulan */}
        <Modal
          visible={posponerStep === 'confirmar_anulan'}
          onDismiss={() => setPosponerStep(null)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.modalCard}>
            <SafeLinearGradient colors={['#b71c1c', '#c62828']} style={styles.modalHeader}>
              <IconButton icon="alert-circle-outline" iconColor="#fff" size={28} style={{ margin: 0 }} />
              <Text style={styles.modalHeaderTitle}>Acción irreversible</Text>
            </SafeLinearGradient>
            <Card.Content style={styles.modalBody}>
              <View style={[styles.confirmBox, styles.confirmBoxDanger]}>
                <IconButton icon="ticket-confirmation-outline" iconColor="#c62828" size={22} style={{ margin: 0, alignSelf: 'flex-start' }} />
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall" style={[styles.alertBoxTitle, { color: '#c62828' }]}>
                    Se anularán {ticketsVendidosCount} ticket{ticketsVendidosCount !== 1 ? 's' : ''}
                  </Text>
                  <Text variant="bodySmall" style={styles.alertBoxText}>
                    Los tickets comprados quedarán marcados como anulados. Sus números volverán a estar disponibles para la venta. Esta acción no se puede deshacer.
                  </Text>
                </View>
              </View>
              <View style={styles.warningRow}>
                <IconButton icon="account-alert-outline" iconColor="#e65100" size={20} style={{ margin: 0 }} />
                <Text variant="bodySmall" style={styles.warningText}>
                  Se recomienda notificar a los participantes afectados antes de guardar.
                </Text>
              </View>
              <Text variant="bodySmall" style={styles.confirmNote}>
                ¿Confirmas que deseas anular los tickets vendidos?
              </Text>
              <View style={styles.modalFooter}>
                <Button mode="outlined" onPress={() => setPosponerStep('decision')} style={styles.modalBtnSecondary} textColor="#7b2cbf" icon="arrow-left">
                  Atrás
                </Button>
                <Button
                  mode="contained"
                  buttonColor="#c62828"
                  onPress={() => ejecutarGuardado(true)}
                  loading={saving}
                  style={styles.modalBtnPrimary}
                  icon="check"
                >
                  Sí, anular y guardar
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  card: { elevation: 4 },
  title: { fontWeight: 'bold', marginBottom: 24 },
  input: { marginBottom: 16, backgroundColor: '#fff' },
  dateTimeContainer: { marginBottom: 16 },
  dateTimeRow: { flexDirection: 'row', gap: 8 },
  dateInput: { flex: 1 },
  timeInput: { flex: 1 },
  imagesContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 12 },
  imageWrapper: { position: 'relative', width: 100, height: 100, borderRadius: 8, overflow: 'hidden', marginBottom: 8 },
  imagePreview: { width: '100%', height: '100%', borderRadius: 8 },
  removeImageButton: { position: 'absolute', top: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', margin: 0 },
  addImageButton: { width: 100, height: 100, borderRadius: 8, borderWidth: 2, borderColor: '#7b2cbf', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3e8ff' },
  addImageText: { fontSize: 32, color: '#7b2cbf', fontWeight: 'bold' },
  addImageLabel: { fontSize: 12, color: '#7b2cbf', marginTop: 4 },
  sectionTitle: { fontWeight: 'bold', marginTop: 16, marginBottom: 12 },
  sectionSubtitle: { color: '#666', marginBottom: 12, fontSize: 12 },
  productoCard: { marginBottom: 16, backgroundColor: '#fff3e0' },
  productoTitle: { fontWeight: 'bold', marginBottom: 8, color: '#ff9800' },
  addButton: { marginTop: 8, marginBottom: 16 },
  saveButton: { marginTop: 8 },
  saveButtonContent: { paddingVertical: 8 },
  portadaPreviewWrapper: { marginBottom: 16 },
  portadaPreview: { width: '100%', height: 180, borderRadius: 12, marginBottom: 8 },
  portadaActions: { flexDirection: 'row', gap: 8 },
  portadaButton: { flex: 1 },
  portadaPlaceholder: { height: 120, borderRadius: 12, borderWidth: 2, borderColor: '#7b2cbf', borderStyle: 'dashed', backgroundColor: '#f3e8ff', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  portadaPlaceholderText: { color: '#7b2cbf', fontSize: 16, fontWeight: '600' },
  promoCard: { marginBottom: 12, backgroundColor: '#e8f5e9' },
  promoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  promoInfo: { flex: 1 },
  promoTitle: { fontWeight: 'bold', color: '#4caf50', marginBottom: 4 },
  promoPrice: { color: '#212121', fontWeight: '600', fontSize: 16 },
  promoDesc: { color: '#666', marginTop: 4, fontSize: 12 },
  promoActions: { flexDirection: 'row' },

  // Modales premium
  modalContainer: { padding: 20, margin: 16 },
  modalCard: { borderRadius: 20, overflow: 'hidden', elevation: 12 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 8,
  },
  modalHeaderTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  modalBody: { paddingTop: 20, paddingBottom: 8 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  modalBtnSecondary: { borderColor: '#7b2cbf', borderRadius: 10 },
  modalBtnPrimary: { borderRadius: 10 },

  // Elementos informativos dentro de modales
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  infoText: { flex: 1, color: '#424242', lineHeight: 22, paddingTop: 8 },
  divider: { backgroundColor: '#e0e0e0', marginVertical: 12 },
  alertBox: { flexDirection: 'row', backgroundColor: '#f3e8ff', borderRadius: 12, padding: 12, alignItems: 'flex-start', gap: 4 },
  alertBoxTitle: { color: '#5c35a0', fontWeight: '700', marginBottom: 4 },
  alertBoxText: { color: '#424242', lineHeight: 20 },
  confirmBox: { flexDirection: 'row', backgroundColor: '#e8f5e9', borderRadius: 12, padding: 12, alignItems: 'flex-start', gap: 4, marginBottom: 12 },
  confirmBoxDanger: { backgroundColor: '#ffebee' },
  confirmNote: { color: '#616161', textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
  warningRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff3e0', borderRadius: 10, padding: 8, marginTop: 8, gap: 2 },
  warningText: { flex: 1, color: '#e65100', lineHeight: 20, paddingTop: 8 },

  // Tarjetas de decisión (opción A / opción B)
  decisionQuestion: { color: '#424242', marginBottom: 16, lineHeight: 22 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fafafa',
    gap: 4,
  },
  optionCardSelected: {
    borderColor: '#7b2cbf',
    backgroundColor: '#7b2cbf',
  },
  optionCardDanger: {
    borderColor: '#c62828',
    backgroundColor: '#c62828',
  },
  optionIconWrap: { marginTop: 2 },
  optionTitle: { fontWeight: '700', color: '#212121', marginBottom: 4, fontSize: 14 },
  optionTitleSelected: { color: '#fff' },
  optionTitleDanger: { color: '#fff' },
  optionDesc: { color: '#616161', fontSize: 13, lineHeight: 19 },
  optionDescSelected: { color: 'rgba(255,255,255,0.9)' },
  optionDescDanger: { color: 'rgba(255,255,255,0.9)' },
});
