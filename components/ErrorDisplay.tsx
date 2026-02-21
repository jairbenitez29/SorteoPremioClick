import React from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ErrorDisplayProps {
  visible: boolean;
  title?: string;
  message: string;
  onDismiss: () => void;
  type?: 'error' | 'warning' | 'info';
}

export function ErrorDisplay({ 
  visible, 
  title = 'Error', 
  message, 
  onDismiss,
  type = 'error'
}: ErrorDisplayProps) {
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return 'alert';
      case 'info':
        return 'information';
      default:
        return 'alert-circle';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'warning':
        return '#ff9800';
      case 'info':
        return '#2196f3';
      default:
        return '#d32f2f';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Card style={styles.card}>
          <Card.Content style={styles.content}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons 
                name={getIcon()} 
                size={48} 
                color={getColor()} 
              />
            </View>
            
            <Text variant="titleLarge" style={[styles.title, { color: getColor() }]}>
              {title}
            </Text>
            
            <Text variant="bodyMedium" style={styles.message}>
              {message}
            </Text>
            
            <Button
              mode="contained"
              onPress={onDismiss}
              style={[styles.button, { backgroundColor: getColor() }]}
              contentStyle={styles.buttonContent}
            >
              Entendido
            </Button>
          </Card.Content>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    elevation: 8,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
    lineHeight: 22,
  },
  button: {
    minWidth: 120,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 4,
  },
});
