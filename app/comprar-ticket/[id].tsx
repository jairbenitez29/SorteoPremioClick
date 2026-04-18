import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Card, Text, Button, ActivityIndicator, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import { SafeLinearGradient } from '../../components/SafeLinearGradient';

const PRECIO_TICKET_STORAGE_KEY = (sorteoId: string | string[]) => `precio_ticket_${Array.isArray(sorteoId) ? sorteoId[0] : sorteoId}`;
const SORTEO_CACHE_KEY = (sorteoId: string | string[]) => `cache_sorteo_${Array.isArray(sorteoId) ? sorteoId[0] : sorteoId}`;
const LIST_CACHE_KEY = 'cache_sorteos';
const CACHE_TTL = 5 * 60 * 1000;

async function getCachedSorteo(sorteoId: string | string[]): Promise<any | null> {
  const sid = Array.isArray(sorteoId) ? sorteoId[0] : sorteoId;
  try {
    // 1. Buscar caché del detalle específico
    const raw = await AsyncStorage.getItem(SORTEO_CACHE_KEY(sid));
    if (raw) {
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts <= CACHE_TTL) return data;
    }
    // 2. Fallback: buscar en la lista de sorteos cacheada
    const listRaw = await AsyncStorage.getItem(LIST_CACHE_KEY);
    if (listRaw) {
      const { data: list } = JSON.parse(listRaw);
      const found = list?.find((s: any) => String(s.id) === String(sid));
      if (found) return found;
    }
  } catch {}
  return null;
}

async function cacheSorteo(sorteoId: string | string[], data: any) {
  try {
    await AsyncStorage.setItem(SORTEO_CACHE_KEY(sorteoId), JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

/** Monto total a cobrar en CLP (el mismo que ve el usuario). El backend convierte a USD (ej. montoClp/1000) para PayPal. */
function getMontoClp(sorteo: any, cantidad: number, promocionSeleccionada: any, localPrecioTicket: number | null): number {
  let precioUnitario = 0;
  if (sorteo.precio_ticket != null && !Number.isNaN(parseFloat(sorteo.precio_ticket)) && parseFloat(sorteo.precio_ticket) > 0) {
    precioUnitario = parseFloat(sorteo.precio_ticket);
  } else if (localPrecioTicket != null && localPrecioTicket > 0) {
    precioUnitario = localPrecioTicket;
  } else if (sorteo.tickets?.length > 0) {
    const n = parseFloat(sorteo.tickets[0].precio);
    if (!Number.isNaN(n) && n > 0) precioUnitario = n;
  }
  const cantidadTickets = promocionSeleccionada ? (promocionSeleccionada.cantidad_tickets || cantidad) : cantidad;
  const precioTotal = precioUnitario * cantidadTickets;
  const precioPromo = promocionSeleccionada && (promocionSeleccionada.precio != null || promocionSeleccionada.precio_total != null)
    ? parseFloat(promocionSeleccionada.precio || promocionSeleccionada.precio_total) || 0
    : null;
  return precioPromo !== null ? precioPromo : precioTotal;
}

import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

export default function ComprarTicketScreen() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { user } = useAuth();
  const [sorteo, setSorteo] = useState<any>(null);
  const [localPrecioTicket, setLocalPrecioTicket] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cantidad, setCantidad] = useState<number>(1);
  const [promocionSeleccionada, setPromocionSeleccionada] = useState<any>(null);

  useEffect(() => {
    loadSorteo();
  }, [id]);

  const loadPrecioTicket = async () => {
    const storageKey = PRECIO_TICKET_STORAGE_KEY(id);
    const stored = await AsyncStorage.getItem(storageKey);
    if (stored != null && stored !== '') {
      const num = parseFloat(stored);
      setLocalPrecioTicket(!Number.isNaN(num) && num > 0 ? num : null);
    } else {
      setLocalPrecioTicket(null);
    }
  };

  const loadSorteo = async () => {
    // Mostrar caché inmediatamente si existe
    const cached = await getCachedSorteo(id);
    if (cached) {
      setSorteo(cached);
      await loadPrecioTicket();
      setLoading(false);
      // Actualizar en segundo plano
      api.get(`/sorteos/${id}`).then(r => {
        setSorteo(r.data);
        cacheSorteo(id, r.data);
      }).catch(() => {});
      return;
    }
    // Sin caché: esperar con spinner
    try {
      setLoading(true);
      const response = await api.get(`/sorteos/${id}`);
      setSorteo(response.data);
      cacheSorteo(id, response.data);
      await loadPrecioTicket();
    } catch (error) {
      console.error('Error al cargar sorteo:', error);
      Alert.alert(
        'Error de conexión',
        'No se pudo cargar el sorteo. Verifica tu conexión e intenta de nuevo.',
        [
          { text: 'Reintentar', onPress: () => loadSorteo() },
          { text: 'Volver', style: 'cancel', onPress: () => router.back() },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleComprar = async () => {
    if (!sorteo) return;

    // Verificar si el usuario está logueado
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
      return;
    }

    setProcessing(true);

    try {
      // Reservar tickets
      const cantidadTickets = promocionSeleccionada ? promocionSeleccionada.cantidad_tickets : cantidad;
      const reservaResponse = await api.post('/tickets/reservar', {
        sorteoId: parseInt(id as string),
        cantidad: cantidadTickets,
      });

      const tickets = reservaResponse.data.tickets;
      const ticketIds = tickets.map((t: any) => t.id);

      // Monto a cobrar en CLP: el mismo que ve el usuario. El backend convierte a USD (1000 CLP = 1 USD) para PayPal.
      const montoClp = getMontoClp(sorteo, cantidad, promocionSeleccionada, localPrecioTicket);
      if (montoClp <= 0) {
        Alert.alert('Error', 'El monto a pagar no es válido. Verifica el precio del sorteo.');
        setProcessing(false);
        return;
      }

      // Crear pago PayPal (enviamos monto en CLP; el backend lo convierte a USD)
      let pagoResponse;
        try {
          pagoResponse = await api.post('/pagos/paypal/create', {
            ticketIds,
            monto: montoClp,
            montoClp: montoClp,
          });
        } catch (error: any) {
          console.error('Error al crear pago PayPal:', error);
          console.error('Detalles del error:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
          });
          
          let errorMessage = 'No se pudo crear el pago. Por favor, intenta de nuevo.';
          
          if (error.response?.data?.error) {
            errorMessage = error.response.data.error;
            if (error.response.data.details) {
              errorMessage += `\n\nDetalles: ${error.response.data.details}`;
            }
          } else if (error.response?.status === 400) {
            errorMessage = 'Error en la solicitud. Verifica que los tickets estén disponibles.';
          } else if (error.response?.status === 401) {
            errorMessage = 'Error de autenticación con PayPal. Contacta al administrador.';
          }
          
          Alert.alert('Error al procesar compra', errorMessage, [{ text: 'OK' }]);
          setProcessing(false);
          return;
        }

        const approvalUrl = pagoResponse.data.approvalUrl;
        const paymentId = pagoResponse.data.paymentId;
        const pagoId = pagoResponse.data.pagoId;

        if (!approvalUrl || !paymentId || !pagoId) {
          Alert.alert('Error', 'No se recibió la información completa del pago. Por favor, intenta de nuevo.');
          setProcessing(false);
          return;
        }

        // Configurar WebBrowser para manejar el retorno
        WebBrowser.maybeCompleteAuthSession();

        // Abrir PayPal en el navegador con deep linking
        const redirectUrl = `sorteosapp://pago/paypal?pagoId=${pagoId}&paymentId=${paymentId}`;
        const result = await WebBrowser.openAuthSessionAsync(
          approvalUrl,
          redirectUrl
        );

        if (result.type === 'success') {
          // Extraer parámetros de la URL de retorno
          try {
            const url = new URL(result.url);
            const payerId = url.searchParams.get('PayerID') || url.searchParams.get('payerId');
            const token = url.searchParams.get('token') || url.searchParams.get('paymentId') || paymentId;

            if (payerId && token) {
              // Ejecutar el pago
              try {
                const executeResponse = await api.post('/pagos/paypal/execute', {
                  paymentId: token,
                  payerId: payerId,
                  pagoId: pagoId,
                });

                if (executeResponse.data.success) {
                  Alert.alert(
                    '¡Pago Exitoso!',
                    'Tu compra se ha procesado correctamente. Ya puedes ver tus tickets.',
                    [
                      {
                        text: 'Ver Mis Tickets',
                        onPress: () => {
                          setProcessing(false);
                          router.push('/(tabs)/mis-tickets');
                        },
                      },
                    ]
                  );
                } else {
                  Alert.alert('Error', 'El pago no se pudo completar. Por favor, contacta al soporte.');
                  setProcessing(false);
                }
              } catch (error: any) {
                console.error('Error al ejecutar pago:', error);
                Alert.alert(
                  'Error',
                  error.response?.data?.error || 'Hubo un problema al procesar el pago. Por favor, contacta al soporte.',
                  [{ text: 'OK', onPress: () => setProcessing(false) }]
                );
              }
            } else {
              // Si no hay parámetros, preguntar al usuario
              Alert.alert(
                'Pago',
                '¿Completaste el pago en PayPal?',
                [
                  { 
                    text: 'No', 
                    style: 'cancel',
                    onPress: () => setProcessing(false)
                  },
                  {
                    text: 'Sí',
                    onPress: async () => {
                      // Intentar ejecutar con el paymentId guardado
                      try {
                        const executeResponse = await api.post('/pagos/paypal/execute', {
                          paymentId: paymentId,
                          payerId: 'pending', // PayPal puede requerir esto
                          pagoId: pagoId,
                        });

                        if (executeResponse.data.success) {
                          Alert.alert(
                            '¡Pago Exitoso!',
                            'Tu compra se ha procesado correctamente.',
                            [
                              {
                                text: 'Ver Mis Tickets',
                                onPress: () => {
                                  setProcessing(false);
                                  router.push('/(tabs)/mis-tickets');
                                },
                              },
                            ]
                          );
                        }
                      } catch (error: any) {
                        console.error('Error al verificar pago:', error);
                        Alert.alert(
                          'Verificación',
                          'El pago se procesará automáticamente. Verifica tus tickets en unos momentos.',
                          [
                            {
                              text: 'OK',
                              onPress: () => {
                                setProcessing(false);
                                router.push('/(tabs)/mis-tickets');
                              },
                            },
                          ]
                        );
                      }
                    },
                  },
                ]
              );
            }
          } catch (urlError) {
            console.error('Error al parsear URL:', urlError);
            // Si hay error parseando la URL, preguntar al usuario
            Alert.alert(
              'Pago',
              '¿Completaste el pago en PayPal?',
              [
                { 
                  text: 'No', 
                  style: 'cancel',
                  onPress: () => setProcessing(false)
                },
                {
                  text: 'Sí',
                  onPress: () => {
                    setProcessing(false);
                    router.push('/(tabs)/mis-tickets');
                  },
                },
              ]
            );
          }
        } else if (result.type === 'cancel' || result.type === 'dismiss') {
          setProcessing(false);
          Alert.alert(
            'Pago Cancelado',
            'El pago fue cancelado. Si completaste el pago en PayPal, puedes verificar tus tickets.',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Verificar Tickets',
                onPress: () => router.push('/(tabs)/mis-tickets'),
              },
            ]
          );
        }
    } catch (error: any) {
      console.error('Error al procesar compra:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudo procesar la compra'
      );
    } finally {
      setProcessing(false);
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

  // Precio unitario: primero API (cuando el servidor guarda precio_ticket), luego respaldo local, luego tickets
  let precioUnitario = 0;
  if (sorteo.precio_ticket !== undefined && sorteo.precio_ticket !== null) {
    const n = parseFloat(sorteo.precio_ticket);
    if (!Number.isNaN(n) && n > 0) precioUnitario = n;
  }
  if (precioUnitario === 0 && localPrecioTicket != null && localPrecioTicket > 0) {
    precioUnitario = localPrecioTicket;
  }
  if (precioUnitario === 0 && sorteo.tickets?.length > 0) {
    const n = parseFloat(sorteo.tickets[0].precio);
    if (!Number.isNaN(n) && n > 0) precioUnitario = n;
  }

  const precioTotal = precioUnitario * cantidad;
  const precioPromocion = promocionSeleccionada && (promocionSeleccionada.precio != null || promocionSeleccionada.precio_total != null)
    ? parseFloat(promocionSeleccionada.precio || promocionSeleccionada.precio_total) || 0 
    : null;
  const precioFinal = precioPromocion !== null ? precioPromocion : precioTotal;
  // Filtrar promociones que tengan precio (precio o precio_total) y cantidad_tickets
  const promociones = (sorteo.promociones || []).filter((p: any) => 
    p && 
    (p.precio != null || p.precio_total != null) && 
    p.cantidad_tickets != null
  );

  // Limita el + / - al stock disponible (si viene desde la API)
  const maxTickets =
    (sorteo.estadisticas?.tickets_disponibles != null &&
      !Number.isNaN(parseInt(String(sorteo.estadisticas.tickets_disponibles), 10)) &&
      parseInt(String(sorteo.estadisticas.tickets_disponibles), 10) > 0)
      ? parseInt(String(sorteo.estadisticas.tickets_disponibles), 10)
      : 20;

  const setCantidadNormal = (n: number) => {
    if (promocionSeleccionada) return;
    const next = Math.max(1, Math.min(maxTickets, n || 1));
    setCantidad(next);
    setPromocionSeleccionada(null);
  };

  return (
    <View style={styles.container}>
      <SafeLinearGradient
        colors={['#ffffff', '#f3e8ff', '#e9d5ff']}
        style={styles.header}
      >
        <Text variant="titleLarge" style={styles.headerTitle}>
          Comprar Ticket
        </Text>
        <Text variant="titleMedium" style={styles.headerSubtitle}>
          {sorteo.titulo}
        </Text>
      </SafeLinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Selecciona la cantidad
            </Text>

            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={[
                  styles.stepperButton,
                  (promocionSeleccionada || cantidad <= 1) && styles.stepperButtonDisabled,
                ]}
                onPress={() => {
                  if (promocionSeleccionada) return;
                  setCantidadNormal(cantidad - 1);
                }}
                disabled={!!promocionSeleccionada || cantidad <= 1}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="minus" size={20} color="#7b2cbf" />
              </TouchableOpacity>

              <Text variant="titleMedium" style={styles.stepperValue}>
                {promocionSeleccionada ? promocionSeleccionada.cantidad_tickets : cantidad} Ticket
                {((promocionSeleccionada ? promocionSeleccionada.cantidad_tickets : cantidad) || 0) > 1 ? 's' : ''}
              </Text>

              <TouchableOpacity
                style={[
                  styles.stepperButton,
                  (promocionSeleccionada || cantidad >= maxTickets) && styles.stepperButtonDisabled,
                ]}
                onPress={() => {
                  if (promocionSeleccionada) return;
                  setCantidadNormal(cantidad + 1);
                }}
                disabled={!!promocionSeleccionada || cantidad >= maxTickets}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#7b2cbf" />
              </TouchableOpacity>
            </View>

            <View style={styles.optionsContainer}>
              {/* Opción de 1 ticket */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  !promocionSeleccionada && cantidad === 1 && styles.optionCardSelected,
                ]}
                onPress={() => {
                  setCantidadNormal(1);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.optionHeader}>
                  <View style={[
                    styles.radioCircle,
                    !promocionSeleccionada && cantidad === 1 && styles.radioCircleSelected,
                  ]}>
                    {!promocionSeleccionada && cantidad === 1 && <View style={styles.radioInner} />}
                  </View>
                  <Text variant="bodyLarge" style={[
                    styles.optionTitle,
                    !promocionSeleccionada && cantidad === 1 && styles.optionTitleSelected,
                  ]}>
                    1 Ticket
                  </Text>
                </View>
                <Text variant="titleLarge" style={styles.optionPrice}>
                  ${precioUnitario.toFixed(0)} CLP
                </Text>
              </TouchableOpacity>

              {/* Opción de 2 tickets */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  !promocionSeleccionada && cantidad === 2 && styles.optionCardSelected,
                ]}
                onPress={() => {
                  setCantidadNormal(2);
                }}
                disabled={!!promocionSeleccionada || maxTickets < 2}
                activeOpacity={0.7}
              >
                <View style={styles.optionHeader}>
                  <View
                    style={[
                      styles.radioCircle,
                      !promocionSeleccionada && cantidad === 2 && styles.radioCircleSelected,
                    ]}
                  >
                    {!promocionSeleccionada && cantidad === 2 && <View style={styles.radioInner} />}
                  </View>
                  <Text
                    variant="bodyLarge"
                    style={[
                      styles.optionTitle,
                      !promocionSeleccionada && cantidad === 2 && styles.optionTitleSelected,
                    ]}
                  >
                    2 Tickets
                  </Text>
                </View>
                <Text variant="titleLarge" style={styles.optionPrice}>
                  ${(precioUnitario * 2).toFixed(0)} CLP
                </Text>
              </TouchableOpacity>

              {/* Opción de 3 tickets */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  !promocionSeleccionada && cantidad === 3 && styles.optionCardSelected,
                ]}
                onPress={() => {
                  setCantidadNormal(3);
                }}
                disabled={!!promocionSeleccionada || maxTickets < 3}
                activeOpacity={0.7}
              >
                <View style={styles.optionHeader}>
                  <View
                    style={[
                      styles.radioCircle,
                      !promocionSeleccionada && cantidad === 3 && styles.radioCircleSelected,
                    ]}
                  >
                    {!promocionSeleccionada && cantidad === 3 && <View style={styles.radioInner} />}
                  </View>
                  <Text
                    variant="bodyLarge"
                    style={[
                      styles.optionTitle,
                      !promocionSeleccionada && cantidad === 3 && styles.optionTitleSelected,
                    ]}
                  >
                    3 Tickets
                  </Text>
                </View>
                <Text variant="titleLarge" style={styles.optionPrice}>
                  ${(precioUnitario * 3).toFixed(0)} CLP
                </Text>
              </TouchableOpacity>

              {/* Opción de 5 tickets */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  !promocionSeleccionada && cantidad === 5 && styles.optionCardSelected,
                ]}
                onPress={() => {
                  setCantidadNormal(5);
                }}
                disabled={!!promocionSeleccionada || maxTickets < 5}
                activeOpacity={0.7}
              >
                <View style={styles.optionHeader}>
                  <View
                    style={[
                      styles.radioCircle,
                      !promocionSeleccionada && cantidad === 5 && styles.radioCircleSelected,
                    ]}
                  >
                    {!promocionSeleccionada && cantidad === 5 && <View style={styles.radioInner} />}
                  </View>
                  <Text
                    variant="bodyLarge"
                    style={[
                      styles.optionTitle,
                      !promocionSeleccionada && cantidad === 5 && styles.optionTitleSelected,
                    ]}
                  >
                    5 Tickets
                  </Text>
                </View>
                <Text variant="titleLarge" style={styles.optionPrice}>
                  ${(precioUnitario * 5).toFixed(0)} CLP
                </Text>
              </TouchableOpacity>

              {/* Promociones del sorteo */}
              {promociones.map((promo: any) => {
                  const precioPromo = parseFloat(promo.precio || promo.precio_total) || 0;
                  const cantidadPromo = parseInt(promo.cantidad_tickets) || 1;
                  const precioUnitarioPromo = precioUnitario * cantidadPromo;
                  const tieneDescuento = precioPromo < precioUnitarioPromo;
                  const porcentajeDescuento = tieneDescuento 
                    ? Math.round(((precioUnitarioPromo - precioPromo) / precioUnitarioPromo) * 100)
                    : 0;

                  return (
                    <TouchableOpacity
                      key={promo.id}
                      style={[
                        styles.optionCard,
                        styles.promoCard,
                        promocionSeleccionada?.id === promo.id && styles.optionCardSelected,
                      ]}
                      onPress={() => {
                        setPromocionSeleccionada(promo);
                        setCantidad(cantidadPromo);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.promoBadge}>
                        <MaterialCommunityIcons name="tag" size={16} color="#4caf50" />
                        <Text variant="labelSmall" style={styles.promoBadgeText}>
                          Promoción
                        </Text>
                      </View>
                      <View style={styles.optionHeader}>
                        <View style={[
                          styles.radioCircle,
                          promocionSeleccionada?.id === promo.id && styles.radioCircleSelected,
                        ]}>
                          {promocionSeleccionada?.id === promo.id && <View style={styles.radioInner} />}
                        </View>
                        <View style={styles.promoContent}>
                          <Text variant="bodyLarge" style={[
                            styles.optionTitle,
                            promocionSeleccionada?.id === promo.id && styles.optionTitleSelected,
                          ]}>
                            {cantidadPromo} Tickets
                          </Text>
                          {promo.descripcion && (
                            <Text variant="bodySmall" style={styles.discountText}>
                              {promo.descripcion}
                            </Text>
                          )}
                          {tieneDescuento && (
                            <Text variant="bodySmall" style={styles.discountText}>
                              {porcentajeDescuento}% de descuento
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.priceContainer}>
                        {tieneDescuento && (
                          <Text variant="bodySmall" style={styles.oldPrice}>
                            ${precioUnitarioPromo.toFixed(0)} CLP
                          </Text>
                        )}
                        <Text variant="titleLarge" style={styles.optionPrice}>
                          ${precioPromo.toFixed(0)} CLP
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </View>

            <Divider style={styles.divider} />

            <View style={styles.paymentInfoContainer}>
              <MaterialCommunityIcons 
                name="credit-card" 
                size={24} 
                color="#7b2cbf" 
              />
              <Text variant="bodyLarge" style={styles.paymentInfoText}>
                Pago con PayPal
              </Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.totalContainer}>
              <Text variant="titleMedium" style={styles.totalLabel}>
                Total a pagar:
              </Text>
              <Text variant="headlineSmall" style={styles.totalAmount}>
                ${precioFinal.toFixed(0)} CLP
              </Text>
            </View>
            <View style={{ paddingHorizontal: 14, marginTop: 8 }}>
              <Text variant="bodySmall" style={{ color: '#757575', fontSize: 12, textAlign: 'center' }}>
                Los precios están en pesos chilenos (CLP). Al pagar con PayPal se convertirá automáticamente a USD (1000 CLP = 1 USD).
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleComprar}
          loading={processing}
          disabled={processing}
          style={styles.buyButton}
          contentStyle={styles.buyButtonContent}
          buttonColor="#7b2cbf"
          textColor="#fff"
        >
          {processing ? 'Procesando...' : 'Comprar Ahora'}
        </Button>
      </View>
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
    padding: 12,
    paddingTop: 50,
    paddingBottom: 8,
  },
  headerTitle: {
    color: '#212121',
    fontWeight: 'bold',
    marginBottom: 2,
    fontSize: 18,
  },
  headerSubtitle: {
    color: '#424242',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 12,
  },
  card: {
    elevation: 4,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 10,
    fontSize: 16,
  },
  optionsContainer: {
    gap: 8,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#7b2cbf',
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonDisabled: {
    opacity: 0.5,
  },
  stepperValue: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '800',
    color: '#212121',
  },
  optionCard: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },
  optionCardSelected: {
    borderColor: '#7b2cbf',
    backgroundColor: '#e3f2fd',
  },
  promoCard: {
    borderColor: '#4caf50',
  },
  promoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 8,
    gap: 4,
  },
  promoBadgeText: {
    color: '#4caf50',
    fontWeight: '600',
    fontSize: 10,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  promoContent: {
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#bdbdbd',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#7b2cbf',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7b2cbf',
  },
  optionTitle: {
    color: '#212121',
    fontWeight: '600',
    fontSize: 15,
  },
  optionTitleSelected: {
    color: '#7b2cbf',
  },
  discountText: {
    color: '#4caf50',
    fontWeight: '500',
    fontSize: 11,
    marginTop: 1,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  oldPrice: {
    color: '#9e9e9e',
    textDecorationLine: 'line-through',
    fontSize: 12,
  },
  optionPrice: {
    color: '#7b2cbf',
    fontWeight: 'bold',
    fontSize: 18,
  },
  divider: {
    marginVertical: 12,
    backgroundColor: '#e0e0e0',
  },
  paymentInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#f3e8ff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#7b2cbf',
  },
  paymentInfoText: {
    color: '#7b2cbf',
    fontWeight: '600',
  },
  paymentContainer: {
    gap: 8,
  },
  paymentOption: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },
  paymentOptionSelected: {
    borderColor: '#7b2cbf',
    backgroundColor: '#e3f2fd',
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paymentText: {
    color: '#212121',
    fontWeight: '600',
    flex: 1,
    fontSize: 15,
  },
  paymentTextSelected: {
    color: '#7b2cbf',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    padding: 14,
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#b3e5fc',
  },
  totalLabel: {
    fontWeight: 'bold',
    color: '#212121',
    fontSize: 16,
  },
  totalAmount: {
    fontWeight: 'bold',
    color: '#7b2cbf',
    fontSize: 22,
  },
  buttonContainer: {
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  buyButton: {
    borderRadius: 12,
    elevation: 4,
  },
  buyButtonContent: {
    paddingVertical: 10,
  },
});

