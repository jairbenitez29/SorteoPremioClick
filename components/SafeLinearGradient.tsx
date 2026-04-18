import React from 'react';
import { View, StyleSheet, ViewStyle, ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SafeLinearGradientProps {
  colors: readonly ColorValue[] | ColorValue[];
  style?: ViewStyle;
  children?: React.ReactNode;
  [key: string]: any;
}

export function SafeLinearGradient({ colors, style, children, ...props }: SafeLinearGradientProps) {
  try {
    return (
      <LinearGradient
        colors={colors as readonly [ColorValue, ColorValue, ...ColorValue[]]}
        style={style}
        {...props}
      >
        {children}
      </LinearGradient>
    );
  } catch (error) {
    // Fallback a View si hay algún error con LinearGradient
    console.warn('Error rendering LinearGradient, using View fallback:', error);
    return (
      <View style={[style, { backgroundColor: (colors[0] as string) || '#ffffff' }]}>
        {children}
      </View>
    );
  }
}
