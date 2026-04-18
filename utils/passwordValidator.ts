export interface PasswordStrength {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordStrength {
  const errors: string[] = [];

  if (password.length < 8)
    errors.push('Mínimo 8 caracteres');
  if (!/[A-Z]/.test(password))
    errors.push('Al menos una mayúscula');
  if (!/[a-z]/.test(password))
    errors.push('Al menos una minúscula');
  if (!/[0-9]/.test(password))
    errors.push('Al menos un número');
  if (!/[^A-Za-z0-9]/.test(password))
    errors.push('Al menos un carácter especial (. ! @ # $ % etc.)');

  return { valid: errors.length === 0, errors };
}

export function getPasswordStrengthLabel(password: string): { label: string; color: string } {
  if (!password) return { label: '', color: '#ccc' };
  const { errors } = validatePassword(password);
  const score = 5 - errors.length;
  if (score <= 1) return { label: 'Muy débil', color: '#f44336' };
  if (score === 2) return { label: 'Débil', color: '#ff9800' };
  if (score === 3) return { label: 'Regular', color: '#ffc107' };
  if (score === 4) return { label: 'Fuerte', color: '#8bc34a' };
  return { label: 'Muy fuerte', color: '#4caf50' };
}
