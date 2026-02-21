# 📋 Guía de Uso - Sistema de Manejo de Errores

## ✅ Archivos Creados

1. **`components/ErrorDisplay.tsx`** - Componente visual para mostrar errores
2. **`utils/errorHandler.ts`** - Funciones para formatear mensajes de error
3. **`hooks/useErrorHandler.ts`** - Hook personalizado para manejar errores

## 🚀 Cómo Usar

### Paso 1: Importar el hook y el componente

```typescript
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';
```

### Paso 2: Usar el hook en tu componente

```typescript
export default function MiComponente() {
  const { errorVisible, errorTitle, errorMessage, errorType, showError, hideError } = useErrorHandler();
  
  // ... resto del código
}
```

### Paso 3: Mostrar errores

En lugar de usar `Alert.alert`, usa `showError`:

```typescript
// ANTES:
catch (error: any) {
  Alert.alert('Error', error.response?.data?.error || 'Error desconocido');
}

// DESPUÉS:
catch (error: any) {
  showError(error);
}
```

### Paso 4: Agregar el componente al final del JSX

```typescript
return (
  <View>
    {/* Tu contenido */}
    
    <ErrorDisplay
      visible={errorVisible}
      title={errorTitle}
      message={errorMessage}
      type={errorType}
      onDismiss={hideError}
    />
  </View>
);
```

## 📝 Ejemplo Completo

```typescript
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from 'react-native-paper';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { api } from '../../services/api';

export default function MiComponente() {
  const { errorVisible, errorTitle, errorMessage, errorType, showError, hideError } = useErrorHandler();
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    setLoading(true);
    try {
      await api.post('/endpoint', { data: 'value' });
      // Éxito
    } catch (error: any) {
      showError(error); // Muestra error con estilo
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Button onPress={handleAction} loading={loading}>
        Acción
      </Button>
      
      <ErrorDisplay
        visible={errorVisible}
        title={errorTitle}
        message={errorMessage}
        type={errorType}
        onDismiss={hideError}
      />
    </View>
  );
}
```

## 🎨 Tipos de Error

El sistema detecta automáticamente el tipo de error:

- **error** (rojo): Errores generales, 500, 400, etc.
- **warning** (naranja): 401, 403, problemas de conexión
- **info** (azul): 404, 409

## 📱 Mensajes Personalizados

Los mensajes se formatean automáticamente según el tipo de error:

- **400**: "Los datos enviados no son válidos..."
- **401**: "Tu sesión ha expirado..."
- **403**: "No tienes permisos..."
- **404**: "No se encontró el recurso..."
- **500**: "Error en el servidor..."
- **Conexión**: "No se pudo conectar al servidor..."

## 🔄 Migración

Para migrar archivos existentes:

1. Agregar imports
2. Agregar el hook
3. Reemplazar `Alert.alert('Error', ...)` con `showError(error)`
4. Agregar el componente `<ErrorDisplay />` al final del JSX
