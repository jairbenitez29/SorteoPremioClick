import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, Image, TouchableOpacity } from 'react-native';
import { Card, Text, Button, TextInput, IconButton, Modal, Portal } from 'react-native-paper';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { api } from '../../services/api';
import { format } from 'date-fns';

const MAX_IMAGE_BYTES = 350 * 1024; // 350KB por imagen aprox
const MAX_REQUEST_BYTES = 3.8 * 1024 * 1024; // ~3.8MB total para evitar 413 en Vercel

function estimateDataUrlBytes(dataUrl: string): number {
  if (!dataUrl) return 0;
  const base64 = dataUrl.split(',')[1] || '';
  return Math.floor((base64.length * 3) / 4);
}

export default function CrearSorteo() {
  const router = useRouter();
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [link, setLink] = useState('');
  const [fechaSorteo, setFechaSorteo] = useState<Date>(new Date());
  const [horaSorteo, setHoraSorteo] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [imagenPortada, setImagenPortada] = useState<string | null>(null);
  const [showPortadaConfirmModal, setShowPortadaConfirmModal] = useState(false);
  const [tempPortadaBase64, setTempPortadaBase64] = useState<string | null>(null);
  const [productos, setProductos] = useState([{ nombre: '', descripcion: '', posicion_premio: 1, imagenes: [] as string[] }]);
  const [promociones, setPromociones] = useState<Array<{ cantidad_tickets: number; precio: number; descripcion?: string }>>([]);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoCantidad, setPromoCantidad] = useState('');
  const [promoPrecio, setPromoPrecio] = useState('');
  const [promoDescripcion, setPromoDescripcion] = useState('');
  const [loading, setLoading] = useState(false);

  const estimateCurrentPayloadBytes = () => {
    let total = imagenPortada ? estimateDataUrlBytes(imagenPortada) : 0;
    for (const p of productos) {
      total += (p.imagenes || []).reduce((acc, img) => acc + estimateDataUrlBytes(img), 0);
    }
    return total;
  };

  const validateCanAddImage = (candidateBytes: number) => {
    if (candidateBytes > MAX_IMAGE_BYTES) {
      Alert.alert(
        'Imagen demasiado grande',
        'Esta imagen sigue siendo pesada. Elige una imagen más liviana o recórtala antes de subir.'
      );
      return false;
    }
    const nextTotal = estimateCurrentPayloadBytes() + candidateBytes;
    if (nextTotal > MAX_REQUEST_BYTES) {
      Alert.alert(
        'Demasiadas imágenes',
        'El sorteo superaría el límite del servidor. Elimina algunas imágenes o usa imágenes más livianas.'
      );
      return false;
    }
    return true;
  };

  const handleAddProducto = () => {
    setProductos([...productos, { nombre: '', descripcion: '', posicion_premio: productos.length + 1, imagenes: [] }]);
  };

  const handleRemoveProducto = (index: number) => {
    if (productos.length > 1) {
      setProductos(productos.filter((_, i) => i !== index));
    }
  };

  const handleUpdateProducto = (index: number, field: string, value: string | string[]) => {
    const updated = [...productos];
    updated[index] = { ...updated[index], [field]: value };
    setProductos(updated);
  };

  const pickImage = async (productoIndex: number) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos necesarios', 'Necesitamos acceso a tu galería para seleccionar imágenes');
      return;
    }
    // Comprimir para no superar el límite de Vercel (413 Payload Too Large) PERO SIN recortar.
    // Para que la imagen salga completa, NO usamos allowsEditing/aspect.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.1,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      // Usar base64 si está disponible, sino usar URI
      let base64Image: string;
      if (asset.base64) {
        base64Image = `data:image/jpeg;base64,${asset.base64}`;
      } else {
        // Si no hay base64, convertir la imagen a base64
        try {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: 'base64' as any,
          });
          base64Image = `data:image/jpeg;base64,${base64}`;
        } catch (error) {
          console.error('Error al convertir imagen a base64:', error);
          Alert.alert('Error', 'No se pudo procesar la imagen');
          return;
        }
      }
      const imageBytes = estimateDataUrlBytes(base64Image);
      if (!validateCanAddImage(imageBytes)) return;
      
      // Agregar imagen al producto específico
      const updated = [...productos];
      updated[productoIndex] = {
        ...updated[productoIndex],
        imagenes: [...updated[productoIndex].imagenes, base64Image]
      };
      setProductos(updated);
    }
  };

  const removeImage = (productoIndex: number, imageIndex: number) => {
    const updated = [...productos];
    updated[productoIndex] = {
      ...updated[productoIndex],
      imagenes: updated[productoIndex].imagenes.filter((_, i) => i !== imageIndex)
    };
    setProductos(updated);
  };

  const pickImagenPortada = async () => {
    // Solicitar permisos
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos necesarios', 'Necesitamos acceso a tu galería para seleccionar la imagen de portada');
      return;
    }

    // Comprimir para no superar límite de Vercel (413). SIN recorte para que se muestre completa.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.1,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      let base64Image: string;
      if (asset.base64) {
        base64Image = `data:image/jpeg;base64,${asset.base64}`;
      } else {
        try {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' as any });
          base64Image = `data:image/jpeg;base64,${base64}`;
        } catch (error) {
          Alert.alert('Error', 'No se pudo procesar la imagen');
          return;
        }
      }
      const imageBytes = estimateDataUrlBytes(base64Image);
      if (!validateCanAddImage(imageBytes)) return;
      setTempPortadaBase64(base64Image);
      setShowPortadaConfirmModal(true);
    }
  };

  const confirmPortada = () => {
    if (tempPortadaBase64) setImagenPortada(tempPortadaBase64);
    setTempPortadaBase64(null);
    setShowPortadaConfirmModal(false);
  };

  const cancelPortada = () => {
    setTempPortadaBase64(null);
    setShowPortadaConfirmModal(false);
  };

  const removeImagenPortada = () => {
    setImagenPortada(null);
  };

  const handleAddPromocion = () => {
    setPromoCantidad('');
    setPromoPrecio('');
    setPromoDescripcion('');
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

    setPromociones([...promociones, {
      cantidad_tickets: cantidad,
      precio: precio,
      descripcion: promoDescripcion || undefined,
    }]);

    setShowPromoModal(false);
    setPromoCantidad('');
    setPromoPrecio('');
    setPromoDescripcion('');
  };

  const handleRemovePromocion = (index: number) => {
    setPromociones(promociones.filter((_, i) => i !== index));
  };

  const handleCrear = async () => {
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

    setLoading(true);
    try {
      console.log('🔍 ========== INICIANDO CREACIÓN DE SORTEO ==========');
      console.log('🔍 Título:', titulo);
      console.log('🔍 Descripción:', descripcion);
      console.log('🔍 Fecha sorteo:', fechaCompleta);
      console.log('🔍 Link:', link);
      console.log('🔍 Cantidad de productos:', productos.length);
      
      // Preparar productos con sus imágenes
      const productosData = productos.map((p, i) => {
        const productoData = {
          nombre: p.nombre,
          descripcion: p.descripcion,
          posicion_premio: i + 1,
          imagenes: p.imagenes || []
        };
        console.log(`🔍 Producto ${i + 1}:`, {
          nombre: productoData.nombre,
          tieneImagenes: (productoData.imagenes?.length || 0) > 0,
          cantidadImagenes: productoData.imagenes?.length || 0
        });
        return productoData;
      });
      
      const requestData = {
        titulo,
        descripcion,
        fecha_sorteo: fechaCompleta,
        link: link || null,
        imagen_portada: imagenPortada || null,
        productos: productosData,
      };

      const estimatedRequestBytes = JSON.stringify(requestData).length;
      if (estimatedRequestBytes > MAX_REQUEST_BYTES) {
        Alert.alert(
          'Sorteo demasiado pesado',
          'El sorteo tiene demasiadas imágenes para el límite del servidor. Reduce cantidad o tamaño de imágenes.'
        );
        return;
      }
      
      console.log('🔍 Datos a enviar (resumen):', {
        titulo: requestData.titulo,
        cantidadProductos: requestData.productos.length,
        productos: requestData.productos.map(p => ({
          nombre: p.nombre,
          imagenes: p.imagenes?.length || 0
        }))
      });
      console.log('🔍 Enviando petición POST a /sorteos...');
      
      const sorteoResponse = await api.post('/sorteos', requestData);
      
      console.log('✅ Respuesta del servidor recibida');
      console.log('✅ Sorteo ID:', sorteoResponse.data?.id);
      const sorteoId = sorteoResponse.data.id;

      // Crear promociones
      if (promociones.length > 0) {
        console.log('🔍 Creando promociones. Cantidad:', promociones.length);
        for (const promo of promociones) {
          await api.post('/promociones', {
            sorteo_id: sorteoId,
            cantidad_tickets: promo.cantidad_tickets,
            precio: promo.precio,
            descripcion: promo.descripcion,
          });
        }
        console.log('✅ Promociones creadas');
      }

      Alert.alert('Éxito', 'Sorteo creado correctamente', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('❌ ========== ERROR AL CREAR SORTEO ==========');
      console.error('❌ Error completo:', error);
      console.error('❌ Tipo de error:', typeof error);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      
      if (error.response) {
        console.error('❌ Response status:', error.response.status);
        console.error('❌ Response data:', JSON.stringify(error.response.data, null, 2));
        console.error('❌ Response headers:', JSON.stringify(error.response.headers, null, 2));
        
        const errorMessage = error.response.data?.error || 
                            error.response.data?.message || 
                            error.response.data?.details ||
                            `Error ${error.response.status}: ${error.response.statusText}`;
        
        const fullError = `Status: ${error.response.status}\n\n${errorMessage}`;
        
        Alert.alert(
          'Error al crear sorteo', 
          `Detalles del error:\n\n${fullError}\n\nRevisa la consola para más información.`,
          [{ text: 'OK' }]
        );
      } else if (error.request) {
        console.error('❌ Request enviada pero sin respuesta:', error.request);
        Alert.alert(
          'Error de conexión', 
          'No se pudo conectar al servidor. Verifica tu conexión a internet.\n\nRevisa la consola para más información.',
          [{ text: 'OK' }]
        );
      } else {
        console.error('❌ Error al configurar la petición:', error.message);
        Alert.alert(
          'Error', 
          `Error: ${error.message}\n\nRevisa la consola para más información.`,
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
      console.log('🔍 ========== FIN CREACIÓN DE SORTEO ==========');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.title}>
            Crear Nuevo Sorteo
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

          <Text variant="titleMedium" style={styles.sectionTitle}>
            🖼️ Imagen de Portada
          </Text>
          <Text variant="bodySmall" style={styles.sectionSubtitle}>
            Esta será la imagen principal que se mostrará en el sorteo
          </Text>
          
          {imagenPortada ? (
            <View style={styles.portadaContainer}>
              <Image source={{ uri: imagenPortada }} style={styles.portadaPreview} />
              <Button
                mode="outlined"
                onPress={removeImagenPortada}
                style={styles.removePortadaButton}
                textColor="#d32f2f"
                icon="delete"
              >
                Eliminar Portada
              </Button>
            </View>
          ) : (
            <TouchableOpacity style={styles.addPortadaButton} onPress={pickImagenPortada}>
              <Text style={styles.addPortadaText}>+</Text>
              <Text style={styles.addPortadaLabel}>Agregar Imagen de Portada</Text>
            </TouchableOpacity>
          )}

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
                
                <Text variant="bodySmall" style={styles.sectionSubtitle}>
                  Fotos de este premio (máximo 5)
                </Text>
                
                <View style={styles.imagesContainer}>
                  {(producto.imagenes || []).map((uri, imgIndex) => (
                    <View key={imgIndex} style={styles.imageWrapper}>
                      <Image source={{ uri }} style={styles.imagePreview} />
                      <IconButton
                        icon="close"
                        size={20}
                        iconColor="#fff"
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index, imgIndex)}
                      />
                    </View>
                  ))}
                  {(producto.imagenes || []).length < 5 && (
                    <TouchableOpacity style={styles.addImageButton} onPress={() => pickImage(index)}>
                      <Text style={styles.addImageText}>+</Text>
                      <Text style={styles.addImageLabel}>Agregar</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
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
            Crea promociones especiales para este sorteo
          </Text>

          {promociones.map((promo, index) => (
            <Card key={index} style={styles.promoCard}>
              <Card.Content>
                <View style={styles.promoHeader}>
                  <View style={styles.promoInfo}>
                    <Text variant="bodyMedium" style={styles.promoTitle}>
                      {promo.cantidad_tickets} Tickets
                    </Text>
                    <Text variant="bodySmall" style={styles.promoPrice}>
                      ${promo.precio.toFixed(0)}
                    </Text>
                    {promo.descripcion && (
                      <Text variant="bodySmall" style={styles.promoDesc}>
                        {promo.descripcion}
                      </Text>
                    )}
                  </View>
                  <IconButton
                    icon="delete"
                    iconColor="#d32f2f"
                    size={20}
                    onPress={() => handleRemovePromocion(index)}
                  />
                </View>
              </Card.Content>
            </Card>
          ))}

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
            onPress={handleCrear}
            loading={loading}
            disabled={loading}
            style={styles.createButton}
            contentStyle={styles.createButtonContent}
          >
            Crear Sorteo
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
                Nueva Promoción
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
                  onPress={() => setShowPromoModal(false)}
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

        <Modal
          visible={showPortadaConfirmModal}
          onDismiss={cancelPortada}
          contentContainerStyle={styles.modalContent}
        >
          <Card>
            <Card.Content>
              <Text variant="titleLarge" style={styles.modalTitle}>
                Confirmar foto principal
              </Text>
              {tempPortadaBase64 ? (
                <Image source={{ uri: tempPortadaBase64 }} style={styles.portadaConfirmPreview} resizeMode="contain" />
              ) : null}
              <Text variant="bodyMedium" style={{ marginVertical: 12 }}>
                ¿Usar esta imagen como foto principal del sorteo?
              </Text>
              <View style={styles.modalActions}>
                <Button mode="outlined" onPress={cancelPortada} style={styles.modalButton}>
                  Cancelar
                </Button>
                <Button mode="contained" onPress={confirmPortada} style={styles.modalButton} buttonColor="#7b2cbf">
                  OK
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
  content: {
    padding: 12,
  },
  card: {
    elevation: 4,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
    fontSize: 20,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  dateTimeContainer: {
    marginBottom: 12,
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
  dateButton: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  productoCard: {
    marginBottom: 12,
    backgroundColor: '#fff3e0',
  },
  productoTitle: {
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#ff9800',
    fontSize: 14,
  },
  addButton: {
    marginTop: 6,
    marginBottom: 12,
  },
  createButton: {
    marginTop: 6,
    marginBottom: 12,
  },
  createButtonContent: {
    paddingVertical: 8,
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
    resizeMode: 'contain',
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
  portadaContainer: {
    marginBottom: 16,
  },
  portadaPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
    resizeMode: 'contain',
  },
  portadaConfirmPreview: {
    width: '100%',
    maxHeight: 280,
    height: 200,
    borderRadius: 12,
  },
  addPortadaButton: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#7b2cbf',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3e8ff',
    marginBottom: 16,
  },
  addPortadaText: {
    fontSize: 48,
    color: '#7b2cbf',
    fontWeight: 'bold',
  },
  addPortadaLabel: {
    fontSize: 14,
    color: '#7b2cbf',
    marginTop: 8,
    fontWeight: '500',
  },
  removePortadaButton: {
    marginTop: 8,
  },
});

