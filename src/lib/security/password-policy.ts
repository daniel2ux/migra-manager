export const PASSWORD_MIN_LENGTH = 10;

export function validatePasswordPolicy(password: string): string | null {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return `A senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  return null;
}

/** Traduz erros do Supabase Auth ao alterar senha. */
export function mapAuthPasswordError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('at least 10') || lower.includes('minimum')) {
    return `A senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (
    lower.includes('known to be weak') ||
    lower.includes('easy to guess') ||
    lower.includes('pwned') ||
    lower.includes('leaked')
  ) {
    return 'Esta senha aparece em vazamentos conhecidos. Escolha outra combinação mais forte.';
  }
  if (lower.includes('different from the old') || lower.includes('should be different')) {
    return 'A nova senha deve ser diferente da senha temporária atual.';
  }

  return message || 'Não foi possível atualizar a senha.';
}
